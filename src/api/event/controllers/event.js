'use strict';

/**
 * event controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::event.event', ({ strapi }) => ({
    // Endpoint personalizado para actualizar nombres de cantos en eventos existentes
    async updateSongNames(ctx) {
        try {
            const events = await strapi.entityService.findMany('api::event.event', {
                populate: {
                    cantos: {
                        populate: ['song']
                    }
                }
            });

            let updatedCount = 0;

            for (const event of events) {
                let needsUpdate = false;

                if (event.cantos && event.cantos.length > 0) {
                    for (const canto of event.cantos) {
                        if (canto.song && canto.song.name) {
                            if (canto.song_name !== canto.song.name) {
                                canto.song_name = canto.song.name;
                                needsUpdate = true;
                            }
                        }
                    }
                }

                if (needsUpdate) {
                    await strapi.entityService.update('api::event.event', event.id, {
                        data: {
                            cantos: event.cantos
                        }
                    });
                    updatedCount++;
                }
            }

            ctx.body = {
                success: true,
                message: `Updated song names in ${updatedCount} events`,
                updatedEventsCount: updatedCount
            };

        } catch (error) {
            strapi.log.error('Error updating song names:', error);
            ctx.throw(500, 'Error updating song names');
        }
    },

    // Generar PDF de portada para evento
    async generatePDF(ctx) {
        const { id } = ctx.params;

        try {
            if (!id) {
                return ctx.badRequest('Event ID is required');
            }

            // Verificar que el evento existe
            const event = await strapi.documents('api::event.event').findOne({ documentId: id, fields: ['name', 'event_date'] });

            if (!event) {
                return ctx.notFound('Event not found');
            }

            // Generar PDF
            let pdfBuffer;

            try {
                pdfBuffer = await strapi
                    .service('api::event.pdf-generator')
                    .generateEventCoverPDF(id);
            } catch (pdfError) {
                strapi.log.error('PDF generation failed:', pdfError);
                ctx.throw(500, 'Fatal error generating PDF');
            }

            // Construir nombre de archivo: YYMMDD_HH:MM_<EventName>.pdf
            let filename = 'evento.pdf';

            if (event.event_date) {
                const eventDateTime = new Date(event.event_date);
                const year = String(eventDateTime.getFullYear()).slice(-2);
                const month = String(eventDateTime.getMonth() + 1).padStart(2, '0');
                const day = String(eventDateTime.getDate()).padStart(2, '0');
                const hours = String(eventDateTime.getHours()).padStart(2, '0');
                const minutes = String(eventDateTime.getMinutes()).padStart(2, '0');

                // Sanitize event name: remove special characters, replace spaces with underscores
                const sanitizedName = event.name
                    ? event.name.trim().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').toLowerCase()
                    : 'evento';

                filename = `${year}${month}${day}_${hours}${minutes}-${sanitizedName}.pdf`;
            }

            // Enviar PDF
            ctx.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length,
                'Access-Control-Expose-Headers': 'Content-Disposition'
            });

            ctx.body = pdfBuffer;
        } catch (error) {
            strapi.log.error('Fatal error in generatePDF:', error);
            ctx.throw(500, 'Fatal error generating PDF');
        }
    },

    // Obtener el estado del PDF almacenado
    async getPDFStatus(ctx) {
        try {
            const { id } = ctx.params;

            if (!id) {
                return ctx.badRequest('Event ID is required');
            }

            const event = await strapi.entityService.findOne('api::event.event', id, {
                fields: ['name', 'pdf_path', 'pdf_filename', 'pdf_generated_at', 'pdf_error']
            });

            if (!event) {
                return ctx.notFound('Event not found');
            }

            const pdfStatus = {
                eventId: id,
                eventName: event.name,
                hasPDF: !!event.pdf_path,
                filename: event.pdf_filename || null,
                path: event.pdf_path || null,
                generatedAt: event.pdf_generated_at || null,
                error: event.pdf_error || null,
                downloadUrl: event.pdf_path ? `${strapi.config.server.url}${event.pdf_path}` : null
            };

            ctx.body = { data: pdfStatus };

        } catch (error) {
            strapi.log.error('Error getting PDF status:', error);
            ctx.throw(500, 'Error getting PDF status');
        }
    }

}));
