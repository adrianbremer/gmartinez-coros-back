'use strict';

/**
 * Custom attendance routes
 */

module.exports = {
    routes: [
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
    ],
};