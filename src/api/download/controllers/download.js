'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
    /**
     * Proxy a file from the uploads folder by its Strapi documentId.
     *
     * Mobile browsers (iOS Safari, Android) require:
     *   - Accept-Ranges: bytes  → needed for range requests / download manager
     *   - Content-Length       → needed to show download progress and detect completion
     *   - Cache-Control: no-store → prevents stale cached responses that break
     *                               repeated downloads on mobile
     *
     * Usage:  GET /api/download/:documentId
     * Example: GET /api/download/abc123xyz
     */
    async downloadFile(ctx) {
        const { documentId } = ctx.params;

        if (!documentId) {
            return ctx.badRequest('Missing documentId');
        }

        // Look up the file record via Strapi's upload plugin
        let fileRecord;
        try {
            fileRecord = await strapi.documents('plugin::upload.file').findOne({
                documentId,
                fields: ['name', 'url', 'mime', 'size'],
            });
        } catch (err) {
            strapi.log.error('Download: error looking up file', err);
            return ctx.internalServerError('Error looking up file');
        }

        if (!fileRecord) {
            return ctx.notFound('File not found');
        }

        // fileRecord.url is like "/uploads/some_hash.pdf"
        // Strip leading slash and resolve against the public directory
        const relativePath = fileRecord.url.replace(/^\//, '');
        const filePath = path.join(process.cwd(), 'public', relativePath);

        // Safety check: must remain inside public/uploads
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!filePath.startsWith(uploadsDir)) {
            return ctx.forbidden('Invalid file path');
        }

        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            return ctx.notFound('File not found on disk');
        }

        const stat = fs.statSync(filePath);
        const filename = fileRecord.name || path.basename(filePath);
        const mimeType = fileRecord.mime || 'application/octet-stream';
        const fileBuffer = fs.readFileSync(filePath);

        ctx.set({
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': stat.size,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store',
            'Access-Control-Expose-Headers': 'Content-Disposition, Content-Length, Accept-Ranges',
        });

        ctx.body = fileBuffer;
    },
};
