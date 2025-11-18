const path = require('path');
const fs = require('fs-extra');

module.exports = {
    async beforeCreate(event) {
        const { data } = event.params;
        await populateSongNames(data);
    },

    async beforeUpdate(event) {
        const { data } = event.params;
        await populateSongNames(data);
    },

    async afterCreate(event) {
        const { result } = event;

        // Generar PDF automáticamente
        setTimeout(async () => {
            try {
                await generateAndStorePDF(result.id, 'created');
            } catch (error) {
                strapi.log.error('Error generating PDF for new event:', error);
            }
        }, 2000); // Esperar 2 segundos para asegurar que el evento esté completamente guardado

        // Crear invitaciones automáticamente si el evento tiene coro
        if (result.coro) {
            setTimeout(async () => {
                try {
                    await strapi.service('api::attendance.attendance').createInvitationsForEvent(result.id);
                } catch (error) {
                    strapi.log.error('Error creating invitations:', error);
                }
            }, 3000); // Ejecutar después del PDF
        }
    },

    async afterUpdate(event) {
        const { result, params } = event;

        // Verificar si la actualización fue solo de metadatos PDF para evitar bucle infinito
        const updatedFields = Object.keys(params.data || {});
        const isPDFMetadataUpdate = updatedFields.every(field =>
            ['pdf_path', 'pdf_filename', 'pdf_generated_at', 'pdf_error'].includes(field)
        );

        // Solo regenerar PDF si NO es una actualización de metadatos PDF
        if (!isPDFMetadataUpdate) {
            setTimeout(async () => {
                try {
                    await generateAndStorePDF(result.id, 'updated');
                } catch (error) {
                    strapi.log.error('Error regenerating PDF for updated event:', error);
                }
            }, 1000);
        }
    },
};

async function populateSongNames(data) {
    if (data.cantos && Array.isArray(data.cantos)) {
        for (let canto of data.cantos) {
            // Caso 1: Es un componente existente (solo tiene ID)
            if (canto.id && !canto.song && !canto.song_name) {
                try {
                    // Buscar el componente completo
                    const cantoComponent = await strapi.db.query('event.canto-entry').findOne({
                        where: { id: canto.id },
                        populate: ['song']
                    });

                    if (cantoComponent && cantoComponent.song && cantoComponent.song.name) {
                        // Actualizar el componente con el song_name
                        await strapi.db.query('event.canto-entry').update({
                            where: { id: canto.id },
                            data: { song_name: cantoComponent.song.name }
                        });
                    }
                } catch (error) {
                    strapi.log.error(`Error processing existing component ${canto.id}:`, error);
                }
            }
            // Caso 2: Es un componente nuevo con datos (tiene song)
            else if (canto.song) {
                try {
                    let songId = typeof canto.song === 'object' ? canto.song.id : canto.song;

                    if (songId) {
                        const songData = await strapi.entityService.findOne('api::song.song', songId, {
                            fields: ['name']
                        });

                        if (songData && songData.name) {
                            canto.song_name = songData.name;
                        }
                    }
                } catch (error) {
                    strapi.log.error('Error fetching song name:', error);
                }
            }
        }
    }
}

/**
 * Genera y almacena el PDF del evento automáticamente
 */
async function generateAndStorePDF(eventId, action) {
    try {
        // Obtener información del evento incluyendo metadatos PDF
        const event = await strapi.entityService.findOne('api::event.event', eventId, {
            fields: ['name', 'event_date', 'pdf_generated_at', 'updatedAt']
        });

        if (!event) {
            throw new Error(`Event ${eventId} not found`);
        }

        // Si el PDF se generó recientemente (menos de 30 segundos), no regenerar
        if (event.pdf_generated_at) {
            const timeSinceGeneration = Date.now() - new Date(event.pdf_generated_at).getTime();
            if (timeSinceGeneration < 30000) { // 30 segundos
                strapi.log.info(`PDF for event ${eventId} was generated recently, skipping regeneration`);
                return { success: true, cached: true };
            }
        }

        // Generar el PDF usando el servicio
        const pdfBuffer = await strapi
            .service('api::event.pdf-generator')
            .generateEventCoverPDF(eventId);

        // Crear nombre del archivo
        const eventName = event.name ? event.name.replace(/[^a-z0-9]/gi, '-').toLowerCase() : 'evento';
        const eventDate = event.event_date ?
            new Date(event.event_date).toISOString().split('T')[0] :
            'sin-fecha';

        const filename = `evento-${eventId}-${eventName}-${eventDate}.pdf`;

        // Definir la ruta donde guardar el PDF
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'events');
        const filePath = path.join(uploadsDir, filename);

        // Crear directorio si no existe
        await fs.ensureDir(uploadsDir);

        // Guardar el PDF en el sistema de archivos
        await fs.writeFile(filePath, pdfBuffer);

        // Actualizar el evento con la ruta del PDF
        await strapi.entityService.update('api::event.event', eventId, {
            data: {
                pdf_path: `/uploads/events/${filename}`,
                pdf_filename: filename,
                pdf_generated_at: new Date(),
                pdf_error: null // Limpiar errores previos
            }
        });

        strapi.log.info(`PDF generated for event ${eventId}`);

        return {
            success: true,
            filename,
            path: filePath
        };

    } catch (error) {
        strapi.log.error(`Error generating PDF for event ${eventId}:`, error);

        // Intentar actualizar el evento con información del error
        try {
            await strapi.entityService.update('api::event.event', eventId, {
                data: {
                    pdf_error: error.message,
                    pdf_generated_at: new Date()
                }
            });
        } catch (updateError) {
            strapi.log.error('Error updating event with PDF error:', updateError);
        }

        return {
            success: false,
            error: error.message
        };
    }
}