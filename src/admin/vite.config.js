import { mergeConfig } from 'vite';

export default (config) => {
    // Important: always return the modified config
    return mergeConfig(config, {
        resolve: {
            alias: {
                '@': '/src',
            },
        },
        server: {
            allowedHosts: [
                'back.coralia.com.mx',
                'localhost',
                '127.0.0.1'
            ],
            host: '0.0.0.0',
            port: 1337
        },
    });
};