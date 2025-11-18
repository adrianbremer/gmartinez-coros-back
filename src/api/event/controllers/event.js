'use strict';

/**
 * event controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::event.event', ({ strapi }) => ({

    // Implementación limpia de findOne
    async findOne(ctx) {
        const { id } = ctx.params;

        try {
            const { query } = await this.sanitizeQuery(ctx);

            // Merge with forced populate for vestment_requirement and cantos with song and all media files
            const populateConfig = {
                ...query,
                populate: {
                    vestment_requirement: true,
                    event_contact: true,
                    coro: true,
                    tiempo_liturgico: true,
                    cantos: {
                        populate: {
                            song: {
                                populate: {
                                    lyrics_file: true,
                                    sheet_music_file: true,
                                    recording_file: true,
                                    backing_track_file: true
                                }
                            }
                        }
                    }
                }
            };

            const entity = await strapi.entityService.findOne('api::event.event', id, populateConfig);

            if (!entity) {
                return ctx.notFound('Event not found');
            }

            const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

            return this.transformResponse(sanitizedEntity);

        } catch (error) {
            strapi.log.error('Event findOne error:', error);
            return ctx.internalServerError('Internal server error');
        }
    },

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
            const event = await strapi.entityService.findOne('api::event.event', id, {
                fields: ['name', 'event_date']
            });

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

                // Fallback: devolver PDF mínimo
                pdfBuffer = Buffer.from(
                    '%PDF-1.4\n' +
                    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
                    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
                    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
                    'trailer\n<< /Root 1 0 R >>\n%%EOF\n',
                    'utf-8'
                );
            }

            // Construir nombre de archivo
            const eventName = event.name ? event.name.replace(/[^a-z0-9]/gi, '-').toLowerCase() : 'evento';
            const eventDate = event.event_date ?
                new Date(event.event_date).toISOString().split('T')[0] :
                'sin-fecha';
            const filename = `evento-${id}-${eventName}-${eventDate}.pdf`;

            // Enviar PDF
            ctx.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length
            });

            ctx.body = pdfBuffer;

        } catch (error) {
            strapi.log.error('Fatal error in generatePDF:', error);

            // Último fallback: siempre devolver algo
            const fallbackPdf = Buffer.from(
                '%PDF-1.4\n' +
                '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
                '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
                '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
                'trailer\n<< /Root 1 0 R >>\n%%EOF\n',
                'utf-8'
            );

            ctx.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="error-fallback.pdf"',
                'Content-Length': fallbackPdf.length
            });

            ctx.body = fallbackPdf;
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
