'use strict';

/**
 * attendance router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

// Create the core router
const coreRouter = createCoreRouter('api::attendance.attendance');

// Custom routes
const customRoutes = [
    {
        method: 'POST',
        path: '/attendances/respond',
        handler: 'attendance.respondToInvitation',
        config: {
            policies: [],
            middlewares: [],
        },
    },
    {
        method: 'GET',
        path: '/attendances/event/:eventId',
        handler: 'attendance.getEventAttendances',
        config: {
            policies: [],
            middlewares: [],
        },
    },
    {
        method: 'GET',
        path: '/attendances/my-invitations',
        handler: 'attendance.getMyInvitations',
        config: {
            policies: [],
            middlewares: [],
        },
    },
    {
        method: 'PUT',
        path: '/attendances/:attendanceId/check-in',
        handler: 'attendance.checkIn',
        config: {
            policies: [],
            middlewares: [],
        },
    },
];

// Export router with custom routes added
module.exports = {
    routes: [
        ...coreRouter.routes,
        ...customRoutes,
    ],
};