'use strict';

/**
 * Event PDF generator service
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs-extra');
const { time } = require('console');

module.exports = ({ strapi }) => ({

    async generateEventCoverPDF(id) {
        try {
            // Get event data with all related information
            const event = await strapi.documents('api::event.event').findOne({
                documentId: id, populate: {
                    vestment_requirement: true,
                    coro: true,
                    cantos: {
                        populate: ['song', 'tiempo_de_celebracion']
                    }
                }
            });

            if (!event) {
                throw new Error(`Event with ID ${id} not found`);
            }

            // Generate the cover PDF
            const coverPdfBuffer = await this.createEventCoverPDF(event);

            // Generate the program page PDF
            const programPdfBuffer = event.cantos && event.cantos.length > 0
                ? await this.createProgramPagePDF(event)
                : null;

            // Get PDFs for all songs (existing lyrics or generated info pages)
            const songPDFs = await this.getSongPDFs(event.cantos);

            // Merge all PDFs: cover -> program (if exists) -> songs
            const pdfBuffersToMerge = [coverPdfBuffer];
            if (programPdfBuffer) {
                pdfBuffersToMerge.push(programPdfBuffer);
            }

            // Add song PDF file paths
            for (const songPdf of songPDFs) {
                pdfBuffersToMerge.push({
                    path: songPdf.pdfPath,
                    isTemp: songPdf.isTemp
                });
            }

            if (pdfBuffersToMerge.length === 1) {
                // Just the cover
                strapi.log.info(`📋 Event ${id}: Generated cover PDF only (no songs)`);
                return coverPdfBuffer;
            }

            // Merge all PDFs
            const finalPdfBuffer = await this.mergePDFBuffers(pdfBuffersToMerge, event);

            strapi.log.info(`📋 Event ${id}: Generated complete PDF with program and ${songPDFs.length} song pages`);
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
                    populate: ['lyrics_file', 'sheet_music_file']
                });

                let pdfPath = null;
                let isTemp = false;

                // Priority 1: Lyrics PDF
                if (songData && songData.lyrics_file && songData.lyrics_file.url) {
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

                // Priority 2: Sheet Music PDF (if no lyrics PDF)
                if (!pdfPath && songData && songData.sheet_music_file && songData.sheet_music_file.url) {
                    const fileExtension = path.extname(songData.sheet_music_file.url).toLowerCase();
                    if (fileExtension === '.pdf') {
                        const fullPath = path.join(process.cwd(), 'public', songData.sheet_music_file.url);
                        if (await fs.pathExists(fullPath)) {
                            pdfPath = fullPath;
                        } else {
                            strapi.log.warn(`Sheet music PDF file not found for song: ${songData.name}`);
                        }
                    }
                }

                // Priority 3: Generated Info Page
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
                    size: 'LETTER',
                    margins: { top: 0, bottom: 0, left: 0, right: 0 }
                });
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                const margin = 50;
                const pageWidth = doc.page.width;
                const contentWidth = pageWidth - (margin * 2);
                let yPosition = margin;

                // Title
                doc.fontSize(24)
                    .font('Helvetica-Bold')
                    .fillColor('#2c3e50')
                    .text(songData.name, margin, yPosition, { width: contentWidth, align: 'center' });

                yPosition += 60;

                // Performance Notes (from Canto)
                if (canto.notes) {
                    doc.fontSize(12)
                        .font('Helvetica-Bold')
                        .fillColor('#2c3e50')
                        .text('Notas de interpretación:', margin, yPosition);

                    yPosition += 20;

                    doc.fontSize(11)
                        .font('Helvetica')
                        .fillColor('#34495e')
                        .text(canto.notes, margin, yPosition, { width: contentWidth });

                    yPosition += doc.heightOfString(canto.notes, { width: contentWidth }) + 30;
                }

                // General Notes (from Song)
                if (songData.notes) {
                    doc.fontSize(12)
                        .font('Helvetica-Bold')
                        .fillColor('#2c3e50')
                        .text('Notas generales:', margin, yPosition);

                    yPosition += 20;

                    doc.fontSize(11)
                        .font('Helvetica')
                        .fillColor('#34495e')
                        .text(songData.notes, margin, yPosition, { width: contentWidth });

                    yPosition += 30;
                }

                // Placeholder for missing files
                yPosition += 40;
                doc.fontSize(12)
                    .fillColor('#e74c3c')
                    .text('Sin archivo de partitura/letra adjunto', margin, yPosition, {
                        width: contentWidth,
                        align: 'center'
                    });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
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
                const doc = new PDFDocument({ size: 'LETTER' });
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

    addHeader(doc, title, subtitle) {
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
            .text(title, margin, 25, {
                width: contentWidth,
                align: 'center'
            });

        // --- Subtitle in Header ---
        doc.fontSize(12)
            .font('Helvetica-Oblique')
            .fillColor('#ecf0f1')
            .text(subtitle, {
                width: contentWidth,
                align: 'center'
            });
    },

    async createEventCoverPDF(event) {
        return new Promise((resolve, reject) => {
            try {
                // Create PDF document with no automatic margins to have full control
                const doc = new PDFDocument({
                    size: 'LETTER',
                    margins: { top: 0, bottom: 0, left: 0, right: 0 }
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
        const timeZone = 'America/Mexico_City'; // adjust if your locale differs
        //const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        this.addHeader(doc, event.name || 'Evento sin nombre', 'Información General');

        let yPosition = 140;

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

            // Date
            doc.fontSize(10).font('Helvetica-Bold').text('FECHA', leftColX, leftY);
            leftY += 15;
            const dateStr = eventDate.toLocaleDateString('es-MX', {
                timeZone: timeZone,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            doc.fontSize(12).font('Helvetica').text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), leftColX, leftY);
            leftY += 30;

            // Time in 12h format
            doc.fontSize(10).font('Helvetica-Bold').text('HORA', leftColX, leftY);
            leftY += 15;
            doc.fontSize(12).font('Helvetica').text(eventDate.toLocaleTimeString('es-MX', {
                timeZone: timeZone,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }), leftColX, leftY);
            leftY += 30;
        }

        if (event.venue) {
            doc.fontSize(10).font('Helvetica-Bold').text('LUGAR', leftColX, leftY);
            leftY += 15;
            doc.fontSize(12).font('Helvetica').text(event.venue, leftColX, leftY, { width: colWidth });
            leftY += 30;
        }

        if (event.description) {
            doc.fontSize(10).font('Helvetica-Bold').text('DESCRIPCIÓN', leftColX, leftY);
            leftY += 15;
            doc.fontSize(12).font('Helvetica').text(event.description, leftColX, leftY, { width: colWidth });
            leftY += 30;
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
            rightY += doc.heightOfString(event.vestment_requirement.name, { width: colWidth });

            // Show vestment description if available
            if (event.vestment_requirement.description) {
                doc.fontSize(9).font('Helvetica').fillColor('#7f8c8d').text(event.vestment_requirement.description, rightColX, rightY, { width: colWidth });
                rightY += doc.heightOfString(event.vestment_requirement.description, { width: colWidth }) + 20;
            } else {
                rightY += 20;
            }
        } else {
            rightY += 20;
        }

        // Sync Y position to the lowest column
        yPosition = Math.max(leftY, rightY) + 10;

        // --- Divider Line ---
        doc.moveTo(margin, yPosition)
            .lineTo(pageWidth - margin, yPosition)
            .lineWidth(1)
            .stroke('#bdc3c7');

        yPosition += 30;

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
                .text('Instrucciones Especiales', margin + boxPadding, boxY + boxPadding);

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

        // --- Program Notes Box ---
        if (event.program_notes) {
            const boxY = yPosition;
            const boxPadding = 15;

            // Calculate height needed
            doc.fontSize(11).font('Helvetica');
            const textHeight = doc.heightOfString(event.program_notes, { width: contentWidth - (boxPadding * 2) });
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
                .text('Notas del programa', margin + boxPadding, boxY + boxPadding);

            // Text inside box
            doc.fontSize(11)
                .font('Helvetica')
                .fillColor('#2c3e50')
                .text(event.program_notes, margin + boxPadding, boxY + boxPadding + 25, {
                    width: contentWidth - (boxPadding * 2),
                    align: 'left'
                });

            yPosition += boxHeight + 30;
        }
    },

    async createProgramPagePDF(event) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'LETTER',
                    margins: { top: 0, bottom: 0, left: 0, right: 0 }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                this.addProgramContent(doc, event);
                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    },

    addProgramContent(doc, event) {
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 50;
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;

        this.addHeader(doc, event.name, 'Programa Musical');

        yPosition = 140;

        // --- List songs with better styling ---
        event.cantos.forEach((canto, index) => {
            if (yPosition > pageHeight - 60) {
                doc.addPage({ margins: { top: 0, bottom: 0, left: 0, right: 0 } });
                yPosition = margin;
            }

            const order = canto.performance_order || (index + 1);

            // Song Number Circle
            doc.circle(margin + 10, yPosition + 6, 10)
                .fill('#3498db');

            doc.fontSize(10)
                .font('Helvetica-Bold')
                .fillColor('#ffffff')
                .text(order.toString(), margin, (yPosition + 2), {
                    width: 20,
                    align: 'center'
                });

            // Tiempo de celebracion
            let songName = canto.song?.name || canto.song_name || `Canto ${index + 1}`;

            if (canto.tiempo_de_celebracion) {
                songName = `[${canto.tiempo_de_celebracion.name}] ${songName}`;
            }

            // Song Title
            doc.fontSize(12)
                .font('Helvetica-Bold')
                .fillColor('#2c3e50')
                .text(songName, margin + 25, (yPosition + 1));

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
    },

    async mergePDFBuffers(pdfBuffersToMerge, event) {
        try {
            strapi.log.info(`Merging ${pdfBuffersToMerge.length} PDF items`);

            // Import pdf-merger-js (it's an ES module)
            const PDFMergerModule = await import('pdf-merger-js');
            const PDFMerger = PDFMergerModule.default;

            const merger = new PDFMerger();
            const tempDir = path.join(process.cwd(), 'public', '.temp');
            await fs.ensureDir(tempDir);

            const tempFiles = [];

            // Process each item in the merge list
            for (let i = 0; i < pdfBuffersToMerge.length; i++) {
                const item = pdfBuffersToMerge[i];
                let filePath;

                // Check if it's a Buffer (cover or program) or a file path object (songs)
                if (Buffer.isBuffer(item)) {
                    // It's a buffer, save it to a temp file
                    const tempFileName = i === 0 ? `cover-${event.id}-${Date.now()}.pdf` : `program-${event.id}-${Date.now()}.pdf`;
                    filePath = path.join(tempDir, tempFileName);
                    await fs.writeFile(filePath, item);
                    tempFiles.push(filePath);
                    strapi.log.debug(`Saved buffer to temp file: ${filePath}`);
                } else if (item && item.path) {
                    // It's a file path object
                    filePath = item.path;
                    if (item.isTemp) {
                        tempFiles.push(filePath);
                    }
                } else {
                    // Skip invalid items
                    strapi.log.warn(`Skipping invalid PDF item at index ${i}`);
                    continue;
                }

                // Verify file exists and add to merger
                if (await fs.pathExists(filePath)) {
                    await merger.add(filePath);
                    strapi.log.debug(`Added to merger: ${filePath}`);
                } else {
                    strapi.log.warn(`PDF file not found: ${filePath}`);
                }
            }

            // Generate merged PDF as buffer
            const mergedPdfBuffer = await merger.saveAsBuffer();
            strapi.log.info(`Successfully merged ${pdfBuffersToMerge.length} PDFs`);

            // Clean up temporary files
            try {
                for (const filePath of tempFiles) {
                    await fs.remove(filePath).catch(() => { });
                }
            } catch (cleanupError) {
                strapi.log.warn('Error cleaning up temporary files:', cleanupError);
            }

            return mergedPdfBuffer;

        } catch (error) {
            strapi.log.error('Error merging PDFs:', error);
            // Fallback: return just the first buffer (cover)
            return Buffer.isBuffer(pdfBuffersToMerge[0]) ? pdfBuffersToMerge[0] : null;
        }
    }
});
