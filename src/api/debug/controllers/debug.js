'use strict';

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

module.exports = {
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

            // Set response headers for ZIP download
            ctx.set('Content-Type', 'application/zip');
            ctx.set('Content-Disposition', `attachment; filename="${zipFileName}"`);

            // Create a ZIP archive
            const archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level
            });

            // Pipe archive data to the response
            archive.pipe(ctx.res);

            // Function to add schema files to the archive
            function addSchemaFilesToArchive(dirPath, archivePath = '') {
                const files = fs.readdirSync(dirPath);

                files.forEach(file => {
                    const fullPath = path.join(dirPath, file);
                    const relativePath = path.join(archivePath, file);
                    const stats = fs.statSync(fullPath);

                    if (stats.isDirectory()) {
                        addSchemaFilesToArchive(fullPath, relativePath);
                    } else if (file === 'schema.json' || file.endsWith('.json')) {
                        // Add file to the archive
                        archive.file(fullPath, { name: relativePath });
                        console.log(`Added to ZIP: ${relativePath}`);
                    }
                });
            }

            // Add all schema files to the archive
            addSchemaFilesToArchive(srcPath);

            // Finalize the archive
            await archive.finalize();

        } catch (error) {
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
