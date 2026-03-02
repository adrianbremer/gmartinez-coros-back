'use strict';

/**
 * attendance router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = {
    routes: [
        // Core CRUD routes
        {
            method: 'GET',
            path: '/attendances',
            handler: 'api::attendance.attendance.find',
        },
        {
            method: 'GET',
            path: '/attendances/:id',
            handler: 'api::attendance.attendance.findOne',
        },
        {
            method: 'POST',
            path: '/attendances',
            handler: 'api::attendance.attendance.create',
        },
        {
            method: 'PUT',
            path: '/attendances/:id',
            handler: 'api::attendance.attendance.update',
        },
        {
            method: 'DELETE',
            path: '/attendances/:id',
            handler: 'api::attendance.attendance.delete',
        },
        // Custom routes
        {
            method: 'POST',
            path: '/attendances/respond',
            handler: 'api::attendance.attendance.respondToInvitation',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/attendances/event/:eventId',
            handler: 'api::attendance.attendance.getEventAttendances',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'PUT',
            path: '/attendances/:attendanceId/check-in',
            handler: 'api::attendance.attendance.checkIn',
            config: {
                policies: [],
                middlewares: [],
            },
        },
    ]
};
