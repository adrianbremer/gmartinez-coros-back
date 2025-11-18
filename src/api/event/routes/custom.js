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
    },
    {
      method: 'GET',
      path: '/events/:id/pdf-status',
      handler: 'api::event.event.getPDFStatus',
      config: {
        auth: false,
        policies: [],
        middlewares: []
      }
    },
    {
      method: 'PUT',
      path: '/events/update-song-names',
      handler: 'api::event.event.updateSongNames',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
};