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

            // Check if event has songs with lyrics PDFs
            const songsWithLyrics = await this.getSongsWithLyrics(event.cantos);

            if (songsWithLyrics.length === 0) {
                // No songs with lyrics, return just the cover
                strapi.log.info(`📋 Event ${eventId}: Generated cover PDF only (no lyrics found)`);
                return coverPdfBuffer;
            }

            // Merge cover PDF with lyrics PDFs
            const finalPdfBuffer = await this.mergePDFs(coverPdfBuffer, songsWithLyrics, event);

            strapi.log.info(`📋 Event ${eventId}: Generated complete PDF with ${songsWithLyrics.length} song lyrics`);
            return finalPdfBuffer;

        } catch (error) {
            strapi.log.error('Error generating event PDF:', error);
            throw error;
        }
    },

    async getSongsWithLyrics(cantos) {
        const songsWithLyrics = [];

        if (!cantos || !Array.isArray(cantos)) {
            return songsWithLyrics;
        }

        // Sort cantos by performance order
        const sortedCantos = cantos
            .filter(canto => canto && (canto.song || canto.song_name))
            .sort((a, b) => (a.performance_order || 0) - (b.performance_order || 0));

        for (const canto of sortedCantos) {
            try {
                const song = canto.song;

                if (!song || !song.id) {
                    continue;
                }

                // Get full song data with lyrics
                const songData = await strapi.entityService.findOne('api::song.song', song.id, {
                    populate: ['lyrics_file']
                });

                if (songData && songData.lyrics_file && songData.lyrics_file.url) {
                    // Check if it's a PDF file
                    const fileExtension = path.extname(songData.lyrics_file.url).toLowerCase();

                    if (fileExtension === '.pdf') {
                        const pdfPath = path.join(process.cwd(), 'public', songData.lyrics_file.url);

                        // Check if the PDF file actually exists
                        if (await fs.pathExists(pdfPath)) {
                            songsWithLyrics.push({
                                song: songData,
                                canto: canto,
                                pdfPath: pdfPath,
                                order: canto.performance_order || 0
                            });
                        } else {
                            strapi.log.warn(`Lyrics PDF file not found for song: ${songData.name}`);
                        }
                    } else {
                        strapi.log.info(`Song "${songData.name}" has lyrics file but it's not a PDF (${fileExtension})`);
                    }
                }
            } catch (error) {
                strapi.log.error(`Error checking song lyrics for canto ${canto.id}:`, error);
            }
        }

        return songsWithLyrics;
    },

    async mergePDFs(coverPdfBuffer, songsWithLyrics, event) {
        try {
            strapi.log.info(`Merging cover PDF with ${songsWithLyrics.length} lyrics PDFs`);
            strapi.log.debug('Song PDFs to merge:', songsWithLyrics.map(s => ({
                name: s.song?.name,
                path: s.pdfPath,
                order: s.order
            })));

            // Use require with await import fallback
            let PDFMerger;
            try {
                PDFMerger = require('pdf-merger-js');
                strapi.log.debug('Loaded pdf-merger-js via require');
            } catch (requireError) {
                strapi.log.debug('require failed, trying dynamic import:', requireError.message);
                const module = await eval('import("pdf-merger-js")');
                PDFMerger = module.default;
                strapi.log.debug('Loaded pdf-merger-js via dynamic import');
            }

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
            for (const songData of songsWithLyrics) {
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

            strapi.log.info(`Added ${addedCount} of ${songsWithLyrics.length} lyrics PDFs to merger`);

            // Generate merged PDF as buffer
            strapi.log.debug('Generating merged PDF buffer...');
            const mergedPdfBuffer = await merger.saveAsBuffer();
            strapi.log.debug('Merged PDF buffer generated, size:', mergedPdfBuffer.length);

            // Clean up temporary files
            try {
                await fs.remove(coverTempPath);
            } catch (cleanupError) {
                strapi.log.warn('Error cleaning up temporary files:', cleanupError);
            }

            strapi.log.info(`Successfully merged PDF with ${songsWithLyrics.length} lyrics PDFs`);
            return mergedPdfBuffer;

        } catch (error) {
            strapi.log.error('Error merging PDFs:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                coverBufferSize: coverPdfBuffer?.length,
                songsCount: songsWithLyrics?.length,
                songPaths: songsWithLyrics?.map(s => s.pdfPath)
            });
            // If merging fails, return just the cover PDF
            strapi.log.warn('Falling back to cover PDF only');
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
        const margin = 50;
        const contentWidth = pageWidth - (margin * 2);

        // Title section
        doc.fontSize(24)
            .font('Helvetica-Bold')
            .fillColor('#2c3e50')
            .text(event.name || 'Evento sin nombre', margin, 80, {
                width: contentWidth,
                align: 'center'
            });

        // Subtitle line
        doc.moveTo(margin, 130)
            .lineTo(pageWidth - margin, 130)
            .stroke('#3498db');

        // Event details section
        let yPosition = 160;
        const lineHeight = 25;

        // Date and time
        if (event.event_date) {
            const eventDate = new Date(event.event_date);

            doc.fontSize(14)
                .font('Helvetica-Bold')
                .fillColor('#2c3e50')
                .text('Fecha:', margin, yPosition);

            doc.font('Helvetica')
                .text(eventDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }), margin + 80, yPosition);

            yPosition += lineHeight;

            doc.font('Helvetica-Bold')
                .text('Hora:', margin, yPosition);

            doc.font('Helvetica')
                .text(eventDate.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                }), margin + 80, yPosition);

            yPosition += lineHeight;
        }

        // Venue
        if (event.venue) {
            doc.font('Helvetica-Bold')
                .text('Lugar:', margin, yPosition);

            doc.font('Helvetica')
                .text(event.venue, margin + 80, yPosition, {
                    width: contentWidth - 80
                });

            yPosition += lineHeight;
        }

        // Choir
        if (event.coro?.name) {
            doc.font('Helvetica-Bold')
                .text('Coro:', margin, yPosition);

            doc.font('Helvetica')
                .text(event.coro.name, margin + 80, yPosition);

            yPosition += lineHeight;
        }

        yPosition += 20;

        // Description section
        if (event.description) {
            doc.font('Helvetica-Bold')
                .fontSize(16)
                .text('Descripción', margin, yPosition);

            yPosition += 25;

            doc.font('Helvetica')
                .fontSize(12)
                .text(event.description, margin, yPosition, {
                    width: contentWidth,
                    align: 'justify'
                });

            yPosition += doc.heightOfString(event.description, {
                width: contentWidth
            }) + 20;
        }

        // Attire requirements
        if (event.vestment_requirement) {
            doc.font('Helvetica-Bold')
                .fontSize(16)
                .text('Vestimenta Requerida', margin, yPosition);

            yPosition += 25;

            if (event.vestment_requirement.name) {
                doc.font('Helvetica-Bold')
                    .fontSize(12)
                    .text('Tipo:', margin, yPosition);

                doc.font('Helvetica')
                    .text(event.vestment_requirement.name, margin + 80, yPosition);

                yPosition += lineHeight;
            }

            if (event.vestment_requirement.description) {
                doc.font('Helvetica-Bold')
                    .text('Descripción:', margin, yPosition);

                yPosition += 15;

                doc.font('Helvetica')
                    .text(event.vestment_requirement.description, margin, yPosition, {
                        width: contentWidth,
                        align: 'justify'
                    });

                yPosition += doc.heightOfString(event.vestment_requirement.description, {
                    width: contentWidth
                }) + 20;
            }
        }

        // Special instructions
        if (event.special_instructions) {
            doc.font('Helvetica-Bold')
                .fontSize(16)
                .text('Instrucciones Especiales', margin, yPosition);

            yPosition += 25;

            doc.font('Helvetica')
                .fontSize(12)
                .text(event.special_instructions, margin, yPosition, {
                    width: contentWidth,
                    align: 'justify'
                });

            yPosition += doc.heightOfString(event.special_instructions, {
                width: contentWidth
            }) + 20;
        }

        // Program summary
        if (event.cantos && event.cantos.length > 0) {
            // Check if we need a new page
            if (yPosition > doc.page.height - 200) {
                doc.addPage();
                yPosition = 80;
            }

            doc.font('Helvetica-Bold')
                .fontSize(16)
                .text('Programa Musical', margin, yPosition);

            yPosition += 25;

            doc.fontSize(12)
                .text(`Total de cantos: ${event.cantos.length}`, margin, yPosition);

            yPosition += 20;

            // List songs
            event.cantos.forEach((canto, index) => {
                if (yPosition > doc.page.height - 100) {
                    doc.addPage();
                    yPosition = 80;
                }

                const songName = canto.song?.name || canto.song_name || `Canto ${index + 1}`;
                const order = canto.performance_order || (index + 1);

                doc.font('Helvetica')
                    .text(`${order}. ${songName}`, margin + 20, yPosition);

                if (canto.notes) {
                    doc.font('Helvetica-Oblique')
                        .fontSize(10)
                        .fillColor('#666666')
                        .text(`   ${canto.notes}`, margin + 30, yPosition + 12);

                    doc.fillColor('#000000').fontSize(12);
                    yPosition += 25;
                } else {
                    yPosition += 15;
                }
            });
        }

        // Footer
        const footerY = doc.page.height - 80;
        doc.fontSize(10)
            .fillColor('#7f8c8d')
            .text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, margin, footerY)
            .text('Sistema de Gestión Coral', pageWidth - margin - 150, footerY);
    }
});