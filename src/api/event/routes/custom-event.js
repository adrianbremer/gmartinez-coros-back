'use strict';

/**
 * Custom event routes
 */

module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/events/update-song-names',
            handler: 'event.updateSongNames',
            config: {
                policies: [],
                middlewares: [],
            },
        },
    ],
};