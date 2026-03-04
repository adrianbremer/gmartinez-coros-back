'use strict';

module.exports = {
    /**
     * An asynchronous register function that runs before
     * your application is initialized.
     *
     * This gives you an opportunity to extend code.
     */
    register({ strapi }) {
        // Fix file downloads on mobile browsers.
        // Mobile browsers (iOS Safari, Android Chrome) send Range requests and are
        // sensitive to caching headers. Without Accept-Ranges and proper Cache-Control,
        // files either fail to download or only download once.
        strapi.server.use(async (ctx, next) => {
            await next();

            if (ctx.path.startsWith('/uploads/')) {
                ctx.set('Accept-Ranges', 'bytes');
                // Prevent stale cached responses from breaking repeated downloads on mobile
                ctx.set('Cache-Control', 'no-cache, must-revalidate');
                ctx.set('Pragma', 'no-cache');
            }
        });
    },

    /**
     * An asynchronous bootstrap function that runs before
     * your application gets started.
     *
     * This gives you an opportunity to set up your data model,
     * run jobs, or perform some special logic.
     */
    bootstrap(/*{ strapi }*/) { },
};
