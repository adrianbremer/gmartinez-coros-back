'use strict';

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

module.exports = {
    async healthCheck(ctx) {
        try {
            const healthData = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                environment: process.env.NODE_ENV || 'development',
                version: process.version,
                platform: process.platform,
                services: {}
            };

            // Check database connectivity
            try {
                const dbStatus = await strapi.db.connection.raw('SELECT 1');
                healthData.services.database = {
                    status: 'connected',
                    type: strapi.db.connection.client.config.client
                };
            } catch (dbError) {
                healthData.services.database = {
                    status: 'error',
                    error: dbError.message
                };
                healthData.status = 'degraded';
            }

            // Check file system access
            try {
                const srcPath = path.join(process.cwd(), 'src');
                const stats = fs.statSync(srcPath);
                healthData.services.filesystem = {
                    status: 'accessible',
                    srcPath: srcPath,
                    srcExists: stats.isDirectory()
                };
            } catch (fsError) {
                healthData.services.filesystem = {
                    status: 'error',
                    error: fsError.message
                };
                healthData.status = 'degraded';
            }

            // Check Strapi services
            try {
                const strapiVersion = strapi.config.get('info.version');
                healthData.services.strapi = {
                    status: 'running',
                    version: strapiVersion
                };
            } catch (strapiError) {
                healthData.services.strapi = {
                    status: 'error',
                    error: strapiError.message
                };
                healthData.status = 'degraded';
            }

            // Set response status based on overall health
            const statusCode = healthData.status === 'healthy' ? 200 : 503;
            ctx.status = statusCode;
            ctx.body = healthData;

        } catch (error) {
            ctx.status = 500;
            ctx.body = {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    },

    async getFileStructure(ctx) {
        try {
            const srcPath = path.join(process.cwd(), 'src');

            function readDirectory(dirPath, relativePath = '') {
                const items = [];
                const files = fs.readdirSync(dirPath);

                files.forEach(file => {
                    const fullPath = path.join(dirPath, file);
                    const relativeFilePath = path.join(relativePath, file);
                    const stats = fs.statSync(fullPath);

                    if (stats.isDirectory()) {
                        items.push({
                            name: file,
                            type: 'directory',
                            path: relativeFilePath,
                            children: readDirectory(fullPath, relativeFilePath)
                        });
                    } else {
                        items.push({
                            name: file,
                            type: 'file',
                            path: relativeFilePath,
                            size: stats.size,
                            modified: stats.mtime
                        });
                    }
                });

                return items;
            }

            const structure = readDirectory(srcPath);

            ctx.body = {
                success: true,
                data: {
                    srcPath,
                    structure,
                    totalFiles: countFiles(structure),
                    totalDirectories: countDirectories(structure)
                }
            };
        } catch (error) {
            ctx.body = {
                success: false,
                error: error.message,
                stack: error.stack
            };
        }
    },

    async getFileContent(ctx) {
        try {
            const { filePath } = ctx.params;
            const fullPath = path.join(process.cwd(), 'src', filePath);

            if (!fs.existsSync(fullPath)) {
                ctx.body = {
                    success: false,
                    error: 'File not found'
                };
                return;
            }

            const content = fs.readFileSync(fullPath, 'utf8');
            const stats = fs.statSync(fullPath);

            ctx.body = {
                success: true,
                data: {
                    path: filePath,
                    content,
                    size: stats.size,
                    modified: stats.mtime
                }
            };
        } catch (error) {
            ctx.body = {
                success: false,
                error: error.message
            };
        }
    },

    async downloadFile(ctx) {
        try {
            const { filePath } = ctx.params;
            const fullPath = path.join(process.cwd(), 'src', filePath);

            if (!fs.existsSync(fullPath)) {
                ctx.body = {
                    success: false,
                    error: 'File not found'
                };
                return;
            }

            const stats = fs.statSync(fullPath);
            const fileName = path.basename(filePath);
            const content = fs.readFileSync(fullPath, 'utf8');

            // Set response headers for file download
            ctx.set('Content-Type', 'application/json');
            ctx.set('Content-Disposition', `attachment; filename="${fileName}"`);
            ctx.set('Content-Length', stats.size);

            ctx.body = content;
        } catch (error) {
            ctx.body = {
                success: false,
                error: error.message
            };
        }
    },

    async downloadAllSchemas(ctx) {
        try {
            const srcPath = path.join(process.cwd(), 'src');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' + new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
            const zipFileName = `schemas-${timestamp}.zip`;

            // Create exports directory if it doesn't exist
            const exportsDir = path.join(process.cwd(), 'exports');
            if (!fs.existsSync(exportsDir)) {
                fs.mkdirSync(exportsDir, { recursive: true });
                console.log('Created exports directory');
            }

            const zipFilePath = path.join(exportsDir, zipFileName);

            // Create a ZIP archive
            const archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level
            });

            // Create write stream to save the file
            const output = fs.createWriteStream(zipFilePath);

            // Collect all files first
            const filesToAdd = [];

            function collectSchemaFiles(dirPath, archivePath = '') {
                const files = fs.readdirSync(dirPath);

                files.forEach(file => {
                    const fullPath = path.join(dirPath, file);
                    const relativePath = path.join(archivePath, file);
                    const stats = fs.statSync(fullPath);

                    if (stats.isDirectory()) {
                        collectSchemaFiles(fullPath, relativePath);
                    } else if (file === 'schema.json' || file.endsWith('.json')) {
                        filesToAdd.push({
                            fullPath,
                            relativePath
                        });
                        console.log(`Added to ZIP: ${relativePath}`);
                    }
                });
            }

            // Collect all schema files
            collectSchemaFiles(srcPath);

            // Pipe archive to file
            archive.pipe(output);

            // Add all files to the archive
            filesToAdd.forEach(file => {
                archive.file(file.fullPath, { name: file.relativePath });
            });

            // Wait for the archive to finish
            await new Promise((resolve, reject) => {
                output.on('close', () => {
                    console.log('Archive finalized successfully');
                    resolve();
                });

                archive.on('error', (err) => {
                    console.error('Archive error:', err);
                    reject(err);
                });

                archive.finalize();
            });

            // Get file stats
            const stats = fs.statSync(zipFilePath);

            // Return success response with file information
            ctx.body = {
                success: true,
                message: 'Schema files exported successfully',
                data: {
                    fileName: zipFileName,
                    filePath: zipFilePath,
                    fileSize: stats.size,
                    fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
                    filesIncluded: filesToAdd.length,
                    timestamp: new Date().toISOString(),
                    files: filesToAdd.map(file => file.relativePath)
                }
            };

        } catch (error) {
            console.error('Export error:', error);
            ctx.status = 500;
            ctx.body = {
                success: false,
                error: error.message
            };
        }
    }
};

function countFiles(items) {
    let count = 0;
    items.forEach(item => {
        if (item.type === 'file') {
            count++;
        } else if (item.children) {
            count += countFiles(item.children);
        }
    });
    return count;
}

function countDirectories(items) {
    let count = 0;
    items.forEach(item => {
        if (item.type === 'directory') {
            count++;
            if (item.children) {
                count += countDirectories(item.children);
            }
        }
    });
    return count;
}
