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
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['person']
      });

      if (!user?.person) {
        return ctx.badRequest('Usuario no tiene persona asociada');
      }

      // Verificar que la persona sea miembro del coro del evento
      const event = await strapi.entityService.findOne('api::event.event', eventId, {
        populate: {
          coro: {
            populate: ['members']
          }
        }
      });

      if (!event?.coro) {
        return ctx.badRequest('Evento no encontrado o no tiene coro asignado');
      }

      const isMember = event.coro.members.some(member => member.id === user.person.id);
      if (!isMember) {
        return ctx.forbidden('No eres miembro del coro de este evento');
      }

      // Buscar o crear registro de asistencia
      let attendance = await strapi.db.query('api::attendance.attendance').findOne({
        where: {
          event: eventId,
          person: user.person.id
        }
      });

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
            person: user.person.id,
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
        filters: { event: eventId },
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

  // Endpoint para que usuario vea sus invitaciones pendientes
  async getMyInvitations(ctx) {
    try {
      const userId = ctx.state.user.id;

      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['person']
      });

      if (!user?.person) {
        return ctx.badRequest('Usuario no tiene persona asociada');
      }

      const attendances = await strapi.documents('api::attendance.attendance').findMany({
        filters: { person: user.person.id },
        populate: {
          event: {
            fields: ['name', 'description', 'event_date', 'venue'],
            populate: {
              coro: {
                fields: ['name']
              }
            }
          }
        }
      });

      ctx.body = { invitations: attendances };

    } catch (error) {
      strapi.log.error('Error fetching user invitations:', error);
      ctx.throw(500, 'Error al obtener invitaciones');
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
      if (attendance.person.user.id !== userId && !ctx.state.user.role.name.includes('admin')) {
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