'use strict';

/**
 * attendance service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::attendance.attendance', ({ strapi }) => ({

    // Crear invitaciones automáticamente cuando se crea un evento
    async createInvitationsForEvent(eventId) {
        try {
            const event = await strapi.documents('api::event.event').findOne({
                documentId: eventId,
                populate: {
                    coro: {
                        populate: ['members']
                    }
                }
            });

            if (!event?.coro?.members) {
                return { success: false, message: 'Evento no tiene coro o miembros' };
            }

            const invitations = [];

            for (const member of event.coro.members) {
                // Verificar si ya existe una invitación
                const existingAttendances = await strapi.documents('api::attendance.attendance').findMany({
                    filters: {
                        event: { documentId: eventId },
                        person: { documentId: member.documentId }
                    }
                });

                if (!existingAttendances[0]) {
                    const attendance = await strapi.documents('api::attendance.attendance').create({
                        data: {
                            event: eventId,
                            person: member.documentId,
                            status: 'pending',
                            invited_date: new Date()
                        }
                    });
                    invitations.push(attendance);
                }
            }

            return {
                success: true,
                invitationsCreated: invitations.length,
                invitations
            };

        } catch (error) {
            strapi.log.error('Error creating invitations for event:', error);
            return { success: false, error: error.message };
        }
    },

    // Enviar recordatorio a miembros pendientes
    async sendReminders(eventId) {
        try {
            const pendingAttendances = await strapi.documents('api::attendance.attendance').findMany({
                filters: {
                    event: eventId,
                    status: 'pending',
                    reminder_sent: false
                },
                populate: {
                    person: {
                        fields: ['email', 'first_name', 'last_name']
                    },
                    event: {
                        fields: ['name', 'event_date']
                    }
                }
            });

            let remindersSent = 0;

            for (const attendance of pendingAttendances) {
                // Aquí integrarías con tu sistema de emails
                // Por ahora solo marcamos como recordatorio enviado
                await strapi.documents('api::attendance.attendance').update({
                    documentId: attendance.documentId,
                    data: { reminder_sent: true }
                });
                remindersSent++;
            }

            return {
                success: true,
                remindersSent
            };

        } catch (error) {
            strapi.log.error('Error sending reminders:', error);
            return { success: false, error: error.message };
        }
    }

}));
