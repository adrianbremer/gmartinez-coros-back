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
                auth: {
                    scope: ['authenticated']
                },
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/attendances/event/:eventId',
            handler: 'attendance.getEventAttendances',
            config: {
                auth: {
                    scope: ['authenticated']
                },
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/attendances/my-invitations',
            handler: 'attendance.getMyInvitations',
            config: {
                auth: {
                    scope: ['authenticated']
                },
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'PUT',
            path: '/attendances/:attendanceId/check-in',
            handler: 'attendance.checkIn',
            config: {
                auth: {
                    scope: ['authenticated']
                },
                policies: [],
                middlewares: [],
            },
        },
    ],
};