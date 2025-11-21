'use strict';

/**
 * Event PDF generator service
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs-extra');

module.exports = ({ strapi }) => ({

    async generateEventCoverPDF(eventId) {
        try {
            // Get event data with all related information
            const event = await strapi.entityService.findOne('api::event.event', eventId, {
                populate: {
                    vestment_requirement: true,
                    coro: true,
                    cantos: {
                        populate: ['song']
                    }
                }
            });

            if (!event) {
                throw new Error(`Event with ID ${eventId} not found`);
            }

            // Generate the cover PDF
            const coverPdfBuffer = await this.createEventCoverPDF(event);

            // Get PDFs for all songs (existing lyrics or generated info pages)
            const songPDFs = await this.getSongPDFs(event.cantos);

            if (songPDFs.length === 0) {
                // No songs at all, return just the cover
                strapi.log.info(`📋 Event ${eventId}: Generated cover PDF only (no songs)`);
                return coverPdfBuffer;
            }

            // Merge cover PDF with song PDFs
            const finalPdfBuffer = await this.mergePDFs(coverPdfBuffer, songPDFs, event);

            strapi.log.info(`📋 Event ${eventId}: Generated complete PDF with ${songPDFs.length} song pages`);
            return finalPdfBuffer;

        } catch (error) {
            strapi.log.error('Error generating event PDF:', error);
            throw error;
        }
    },

    async getSongPDFs(cantos) {
        const songPDFs = [];

        if (!cantos || !Array.isArray(cantos)) {
            return songPDFs;
        }

        // Ensure temp directory exists
        const tempDir = path.join(process.cwd(), 'public', '.temp');
        await fs.ensureDir(tempDir);

        // Sort cantos by performance order
        const sortedCantos = cantos
            .filter(canto => canto && (canto.song || canto.song_name))
            .sort((a, b) => (a.performance_order || 0) - (b.performance_order || 0));

        for (const canto of sortedCantos) {
            try {
                const song = canto.song;

                if (!song || !song.id) {
                    // Skip cantos without linked song (or handle them if needed)
                    continue;
                }

                // Get full song data with lyrics
                const songData = await strapi.entityService.findOne('api::song.song', song.id, {
                    populate: ['lyrics_file']
                });

                let pdfPath = null;
                let isTemp = false;

                if (songData && songData.lyrics_file && songData.lyrics_file.url) {
                    // Check if it's a PDF file
                    const fileExtension = path.extname(songData.lyrics_file.url).toLowerCase();

                    if (fileExtension === '.pdf') {
                        const fullPath = path.join(process.cwd(), 'public', songData.lyrics_file.url);
                        if (await fs.pathExists(fullPath)) {
                            pdfPath = fullPath;
                        } else {
                            strapi.log.warn(`Lyrics PDF file not found for song: ${songData.name}`);
                        }
                    }
                }

                // If no PDF found, generate a info page
                if (!pdfPath) {
                    strapi.log.debug(`Generating info page for song: ${songData.name}`);
                    const buffer = await this.createSongPagePDF(songData, canto);
                    const fileName = `song-${songData.id}-${Date.now()}.pdf`;
                    pdfPath = path.join(tempDir, fileName);
                    await fs.writeFile(pdfPath, buffer);
                    isTemp = true;
                }

                if (pdfPath) {
                    songPDFs.push({
                        song: songData,
                        canto: canto,
                        pdfPath: pdfPath,
                        isTemp: isTemp,
                        order: canto.performance_order || 0
                    });
                }

            } catch (error) {
                strapi.log.error(`Error preparing PDF for canto ${canto.id}:`, error);
            }
        }

        return songPDFs;
    },

    async createSongPagePDF(songData, canto) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Title
                doc.fontSize(24)
                    .font('Helvetica-Bold')
                    .text(songData.name, { align: 'center' });

                doc.moveDown(2);

                // Performance Notes (from Canto)
                if (canto.notes) {
                    doc.fontSize(14)
                        .font('Helvetica-Bold')
                        .text('Notas de interpretación:', { continued: true })
                        .font('Helvetica-Oblique')
                        .text(` ${canto.notes}`);
                    doc.moveDown();
                }

                // General Notes (from Song)
                if (songData.notes) {
                    doc.fontSize(12)
                        .font('Helvetica-Bold')
                        .text('Notas generales:', { continued: true })
                        .font('Helvetica')
                        .text(` ${songData.notes}`);
                    doc.moveDown();
                }

                // Placeholder for lyrics if we had them in text
                doc.moveDown(2);
                doc.fontSize(10)
                    .fillColor('#999999')
                    .text('(Sin archivo de partitura/letra adjunto)', { align: 'center' });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    },

    async mergePDFs(coverPdfBuffer, songPDFs, event) {
        try {
            strapi.log.info(`Merging cover PDF with ${songPDFs.length} song PDFs`);
            strapi.log.debug('Song PDFs to merge:', songPDFs.map(s => ({
                name: s.song?.name,
                path: s.pdfPath,
                order: s.order,
                isTemp: s.isTemp
            })));

            // Import pdf-merger-js (it's an ES module)
            const PDFMergerModule = await import('pdf-merger-js');
            const PDFMerger = PDFMergerModule.default;
            strapi.log.debug('Loaded pdf-merger-js');

            const merger = new PDFMerger();
            const tempDir = path.join(process.cwd(), 'public', '.temp');
            await fs.ensureDir(tempDir);
            strapi.log.debug('Temp directory ready:', tempDir);

            // Save cover PDF to temporary file
            const coverTempPath = path.join(tempDir, `cover-${event.id}-${Date.now()}.pdf`);
            await fs.writeFile(coverTempPath, coverPdfBuffer);
            strapi.log.debug('Cover PDF saved to:', coverTempPath);

            // Add cover PDF first
            await merger.add(coverTempPath);
            strapi.log.debug('Cover PDF added to merger');

            // Add each lyrics PDF in order
            let addedCount = 0;
            for (const songData of songPDFs) {
                try {
                    strapi.log.debug(`Attempting to add lyrics PDF: ${songData.pdfPath}`);
                    // Verify file exists before adding
                    if (await fs.pathExists(songData.pdfPath)) {
                        await merger.add(songData.pdfPath);
                        addedCount++;
                        strapi.log.debug(`Added lyrics PDF for ${songData.song.name}`);
                    } else {
                        strapi.log.warn(`PDF file not found: ${songData.pdfPath}`);
                    }
                } catch (error) {
                    strapi.log.error(`Error adding lyrics PDF for ${songData.song.name}:`, {
                        message: error.message,
                        stack: error.stack,
                        path: songData.pdfPath
                    });
                    // Continue with other PDFs even if one fails
                }
            }

            strapi.log.info(`Added ${addedCount} of ${songPDFs.length} lyrics PDFs to merger`);

            // Generate merged PDF as buffer
            strapi.log.debug('Generating merged PDF buffer...');
            const mergedPdfBuffer = await merger.saveAsBuffer();
            strapi.log.debug('Merged PDF buffer generated, size:', mergedPdfBuffer.length);

            // Clean up temporary files
            try {
                await fs.remove(coverTempPath);
                // Clean up generated song pages
                for (const songData of songPDFs) {
                    if (songData.isTemp) {
                        await fs.remove(songData.pdfPath).catch(() => { });
                    }
                }
            } catch (cleanupError) {
                strapi.log.warn('Error cleaning up temporary files:', cleanupError);
            }

            strapi.log.info(`Successfully merged PDF with ${songPDFs.length} lyrics PDFs`);
            return mergedPdfBuffer;

        } catch (error) {
            strapi.log.error('Error merging PDFs:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                coverBufferSize: coverPdfBuffer?.length,
                songsCount: songPDFs?.length,
                songPaths: songPDFs?.map(s => s.pdfPath)
            });
            // If merging fails, return just the cover PDF
            strapi.log.warn('Falling back to cover PDF only');
            return coverPdfBuffer;
        }
    },

    async addBlankPageToPDF(coverPdfBuffer) {
        try {
            const PDFMergerModule = await import('pdf-merger-js');
            const PDFMerger = PDFMergerModule.default;

            const merger = new PDFMerger();
            const tempDir = path.join(process.cwd(), 'public', '.temp');
            await fs.ensureDir(tempDir);

            // Save cover PDF to temp file
            const coverTempPath = path.join(tempDir, `cover-${Date.now()}.pdf`);
            await fs.writeFile(coverTempPath, coverPdfBuffer);

            // Create a blank page PDF
            const blankPageBuffer = await new Promise((resolve, reject) => {
                const doc = new PDFDocument({ size: 'A4' });
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Add centered text on blank page
                doc.fontSize(12)
                    .fillColor('#999999')
                    .text('Notas / Notes', 50, 400, {
                        width: doc.page.width - 100,
                        align: 'center'
                    });

                doc.end();
            });

            // Save blank page to temp file
            const blankTempPath = path.join(tempDir, `blank-${Date.now()}.pdf`);
            await fs.writeFile(blankTempPath, blankPageBuffer);

            // Merge cover + blank page
            await merger.add(coverTempPath);
            await merger.add(blankTempPath);

            const mergedBuffer = await merger.saveAsBuffer();

            // Clean up
            await fs.remove(coverTempPath).catch(() => { });
            await fs.remove(blankTempPath).catch(() => { });

            return mergedBuffer;
        } catch (error) {
            strapi.log.error('Error adding blank page:', error);
            // Fallback: return original cover
            return coverPdfBuffer;
        }
    },

    async createEventCoverPDF(event) {
        return new Promise((resolve, reject) => {
            try {
                // Create PDF document
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                // Collect PDF data
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Add content to PDF
                this.addCoverContent(doc, event);

                // Finalize PDF
                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    },

    addCoverContent(doc, event) {
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 50;
        const contentWidth = pageWidth - (margin * 2);

        // --- Header Background ---
        doc.rect(0, 0, pageWidth, 120)
            .fill('#2c3e50');

        // --- Title Section ---
        doc.fontSize(28)
            .font('Helvetica-Bold')
            .fillColor('#ffffff')
            .text(event.name || 'Evento sin nombre', margin, 45, {
                width: contentWidth,
                align: 'center'
            });

        // --- Subtitle / Date in Header ---
        if (event.event_date) {
            const eventDate = new Date(event.event_date);
            const dateStr = eventDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            doc.fontSize(12)
                .font('Helvetica')
                .fillColor('#ecf0f1')
                .text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), margin, 85, {
                    width: contentWidth,
                    align: 'center'
                });
        }

        let yPosition = 150;

        // --- Info Grid (2 columns) ---
        const colWidth = contentWidth / 2 - 10;
        const leftColX = margin;
        const rightColX = margin + colWidth + 20;
        let leftY = yPosition;
        let rightY = yPosition;

        // Left Column: Time & Venue
        doc.fillColor('#2c3e50'); // Reset text color

        if (event.event_date) {
            const eventDate = new Date(event.event_date);
            doc.fontSize(10).font('Helvetica-Bold').text('HORA', leftColX, leftY);
            leftY += 15;
            doc.fontSize(12).font('Helvetica').text(eventDate.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            }), leftColX, leftY);
            leftY += 30;
        }

        if (event.venue) {
            doc.fontSize(10).font('Helvetica-Bold').text('LUGAR', leftColX, leftY);
            leftY += 15;
            doc.fontSize(12).font('Helvetica').text(event.venue, leftColX, leftY, { width: colWidth });
            leftY += doc.heightOfString(event.venue, { width: colWidth }) + 20;
        }

        // Right Column: Choir & Type
        if (event.coro?.name) {
            doc.fontSize(10).font('Helvetica-Bold').text('CORO', rightColX, rightY);
            rightY += 15;
            doc.fontSize(12).font('Helvetica').text(event.coro.name, rightColX, rightY, { width: colWidth });
            rightY += 30;
        }

        if (event.vestment_requirement?.name) {
            doc.fontSize(10).font('Helvetica-Bold').text('VESTIMENTA', rightColX, rightY);
            rightY += 15;
            doc.fontSize(12).font('Helvetica').text(event.vestment_requirement.name, rightColX, rightY, { width: colWidth });
            rightY += 30;
        }

        // Sync Y position to the lowest column
        yPosition = Math.max(leftY, rightY) + 10;

        // --- Divider Line ---
        doc.moveTo(margin, yPosition)
            .lineTo(pageWidth - margin, yPosition)
            .lineWidth(1)
            .stroke('#bdc3c7');

        yPosition += 30;

        // --- Description Section ---
        if (event.description) {
            doc.fontSize(14)
                .font('Helvetica-Bold')
                .fillColor('#2c3e50')
                .text('Descripción', margin, yPosition);

            yPosition += 20;

            doc.fontSize(11)
                .font('Helvetica')
                .fillColor('#34495e')
                .text(event.description, margin, yPosition, {
                    width: contentWidth,
                    align: 'justify',
                    lineGap: 2
                });

            yPosition += doc.heightOfString(event.description, { width: contentWidth }) + 25;
        }

        // --- Special Instructions Box ---
        if (event.special_instructions) {
            const boxY = yPosition;
            const boxPadding = 15;

            // Calculate height needed
            doc.fontSize(11).font('Helvetica');
            const textHeight = doc.heightOfString(event.special_instructions, { width: contentWidth - (boxPadding * 2) });
            const boxHeight = textHeight + (boxPadding * 2) + 25; // +25 for title

            // Draw box background
            doc.rect(margin, boxY, contentWidth, boxHeight)
                .fill('#f8f9fa');

            // Box Border
            doc.rect(margin, boxY, contentWidth, boxHeight)
                .stroke('#e9ecef');

            // Title inside box
            doc.fontSize(12)
                .font('Helvetica-Bold')
                .fillColor('#e67e22')
                .text('⚠️ Instrucciones Especiales', margin + boxPadding, boxY + boxPadding);

            // Text inside box
            doc.fontSize(11)
                .font('Helvetica')
                .fillColor('#2c3e50')
                .text(event.special_instructions, margin + boxPadding, boxY + boxPadding + 25, {
                    width: contentWidth - (boxPadding * 2),
                    align: 'left'
                });

            yPosition += boxHeight + 30;
        }

        // --- Program Section ---
        if (event.cantos && event.cantos.length > 0) {
            // Check page break
            if (yPosition > pageHeight - 150) {
                doc.addPage();
                yPosition = 50;
            }

            doc.fontSize(16)
                .font('Helvetica-Bold')
                .fillColor('#2c3e50')
                .text('Programa Musical', margin, yPosition);

            // Small badge for song count
            const countText = `${event.cantos.length} cantos`;
            const countWidth = doc.widthOfString(countText);

            yPosition += 30;

            // List songs with better styling
            event.cantos.forEach((canto, index) => {
                if (yPosition > pageHeight - 60) {
                    doc.addPage();
                    yPosition = 50;
                }

                const songName = canto.song?.name || canto.song_name || `Canto ${index + 1}`;
                const order = canto.performance_order || (index + 1);

                // Song Number Circle
                doc.circle(margin + 10, yPosition + 6, 10)
                    .fill('#3498db');

                doc.fontSize(10)
                    .font('Helvetica-Bold')
                    .fillColor('#ffffff')
                    .text(order.toString(), margin, yPosition, {
                        width: 20,
                        align: 'center'
                    });

                // Song Title
                doc.fontSize(12)
                    .font('Helvetica-Bold')
                    .fillColor('#2c3e50')
                    .text(songName, margin + 35, yPosition);

                // Notes
                if (canto.notes) {
                    const notesHeight = doc.heightOfString(canto.notes, { width: contentWidth - 35 });
                    doc.fontSize(10)
                        .font('Helvetica-Oblique')
                        .fillColor('#7f8c8d')
                        .text(canto.notes, margin + 35, yPosition + 15, {
                            width: contentWidth - 35
                        });
                    yPosition += 15 + notesHeight + 10;
                } else {
                    yPosition += 25;
                }
            });
        }

        // --- Footer ---
        const footerY = pageHeight - 40;
        doc.moveTo(margin, footerY - 10)
            .lineTo(pageWidth - margin, footerY - 10)
            .lineWidth(0.5)
            .stroke('#bdc3c7');

        doc.fontSize(9)
            .fillColor('#95a5a6')
            .text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, margin, footerY)
            .text('Sistema de Gestión Coral', margin, footerY, {
                width: contentWidth,
                align: 'right'
            });
    }
});