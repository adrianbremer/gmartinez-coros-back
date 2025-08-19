'use strict';

/**
 * event-program service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::event-program.event-program');
