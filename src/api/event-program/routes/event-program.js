'use strict';

/**
 * event-program router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::event-program.event-program');
