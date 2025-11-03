module.exports = (config) => {
    // Important: always return the modified config
    return {
        ...config,
        resolve: {
            ...config.resolve,
            alias: {
                ...config.resolve?.alias,
                '@': '/src',
            },
        },
        server: {
            ...config.server,
            allowedHosts: [
                'back.coralia.com.mx',
                'localhost',
                '127.0.0.1',
                '.coralia.com.mx'
            ],
            host: '0.0.0.0'
        },
    };
};