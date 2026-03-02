'use strict';

/**
 * attendance controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::attendance.attendance', ({ strapi }) => ({

    // Endpoint para que miembros respondan a invitaciones
    async respondToInvitation(ctx) {
        try {
            const { eventId, status, notes } = ctx.request.body;
            const userId = ctx.state.user.id;

            // Buscar la persona asociada al usuario
            const users = await strapi.documents('plugin::users-permissions.user').findMany({
                filters: { id: userId },
                populate: { person: true }
            });
            const user = users[0];

            if (!user?.person) {
                return ctx.badRequest('Usuario no tiene persona asociada');
            }

            // Verificar que la persona sea miembro del coro del evento
            const events = await strapi.documents('api::event.event').findMany({
                filters: { documentId: eventId },
                populate: {
                    coro: {
                        populate: { members: true }
                    }
                }
            });
            const event = events[0];

            if (!event?.coro) {
                return ctx.badRequest('Evento no encontrado o no tiene coro asignado');
            }

            const isMember = event.coro.members.some(member => member.documentId === user.person.documentId);
            if (!isMember) {
                return ctx.forbidden('No eres miembro del coro de este evento');
            }

            // Buscar o crear registro de asistencia
            const existingAttendances = await strapi.documents('api::attendance.attendance').findMany({
                filters: {
                    event: { documentId: eventId },
                    person: { documentId: user.person.documentId }
                }
            });
            let attendance = existingAttendances[0];

            if (attendance) {
                // Actualizar respuesta existente
                attendance = await strapi.documents('api::attendance.attendance').update({
                    documentId: attendance.documentId,
                    data: {
                        status,
                        notes: notes || attendance.notes,
                        response_date: new Date()
                    }
                });
            } else {
                // Crear nueva respuesta
                attendance = await strapi.documents('api::attendance.attendance').create({
                    data: {
                        event: eventId,
                        person: user.person.documentId,
                        status,
                        notes,
                        response_date: new Date()
                    }
                });
            }

            ctx.body = {
                success: true,
                attendance,
                message: 'Respuesta registrada exitosamente'
            };

        } catch (error) {
            strapi.log.error('Error responding to invitation:', error);
            ctx.throw(500, 'Error al procesar respuesta');
        }
    },

    // Endpoint para obtener asistencias de un evento
    async getEventAttendances(ctx) {
        try {
            const { eventId } = ctx.params;

            const attendances = await strapi.documents('api::attendance.attendance').findMany({
                filters: { event: { documentId: eventId } },
                populate: {
                    person: {
                        fields: ['first_name', 'last_name', 'email', 'phone'],
                        populate: ['photo']
                    }
                }
            });

            // Agrupar por status para estadísticas
            const stats = {
                total: attendances.length,
                confirmed: attendances.filter(a => a.status === 'confirmed').length,
                declined: attendances.filter(a => a.status === 'declined').length,
                pending: attendances.filter(a => a.status === 'pending').length,
                maybe: attendances.filter(a => a.status === 'maybe').length,
                present: attendances.filter(a => a.is_present === true).length
            };

            ctx.body = {
                attendances,
                stats
            };

        } catch (error) {
            strapi.log.error('Error fetching event attendances:', error);
            ctx.throw(500, 'Error al obtener asistencias');
        }
    },

    // Endpoint para marcar presente (check-in)
    async checkIn(ctx) {
        try {
            const { attendanceId } = ctx.params;
            const userId = ctx.state.user.id;

            // Verificar que es el usuario correcto o admin
            const attendance = await strapi.documents('api::attendance.attendance').findOne({
                documentId: attendanceId,
                populate: {
                    person: {
                        populate: ['user']
                    }
                }
            });

            if (!attendance) {
                return ctx.notFound('Asistencia no encontrada');
            }

            // Verificar permisos (es su propia asistencia o es admin)
            const linkedUserId = attendance.person?.user?.id;
            // const userRole = ctx.state.user.role?.name ?? ctx.state.user.role?.type ?? '';
            // const isAdmin = userRole.toLowerCase().includes('admin');

            if (linkedUserId !== userId /* && !isAdmin */) {
                return ctx.forbidden('No tienes permisos para marcar esta asistencia');
            }

            const updatedAttendance = await strapi.documents('api::attendance.attendance').update({
                documentId: attendanceId,
                data: {
                    is_present: true,
                    attended_date: new Date()
                }
            });

            ctx.body = {
                success: true,
                attendance: updatedAttendance,
                message: 'Presencia registrada exitosamente'
            };

        } catch (error) {
            strapi.log.error('Error checking in:', error);
            ctx.throw(500, 'Error al registrar presencia');
        }
    }

}));
