'use strict';

/**
 * Custom event routes
 */

module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/events/:id/pdf',
            handler: 'api::event.event.generatePDF',
            config: {
                auth: false,  // Permitir acceso sin autenticación por ahora para debugging
                policies: [],
                middlewares: []
            }
        }
    ]
};
