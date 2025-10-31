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
            const entity = await strapi.entityService.findOne('api::event.event', id, query);

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
    }

}));
