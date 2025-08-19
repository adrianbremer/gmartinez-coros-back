'use strict';

/**
 * choir service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::choir.choir');
