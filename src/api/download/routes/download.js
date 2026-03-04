'use strict';

module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/download/:documentId',
            handler: 'download.downloadFile',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
    ],
};
