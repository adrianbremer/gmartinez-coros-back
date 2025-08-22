'use strict';

module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/debug/files',
            handler: 'debug.getFileStructure',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/debug/files/:filePath*',
            handler: 'debug.getFileContent',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/debug/download',
            handler: 'debug.downloadAllSchemas',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/debug/download/:filePath*',
            handler: 'debug.downloadFile',
            config: {
                auth: false,
                policies: [],
                middlewares: [],
            },
        },
    ],
};
