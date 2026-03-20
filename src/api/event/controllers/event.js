'use strict';

/**
 * event controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::event.event', ({ strapi }) => ({
    async find(ctx) {
        // if (ctx.query?.filters?.event_date) {
        //     const dateFilter = ctx.query.filters.event_date;
        //     if (dateFilter.$gte) {
        //         const startDate = new Date(`${dateFilter.$gte}T06:00:00.000Z`);
        //         dateFilter.$gte = startDate.toISOString();
        //     }
        //     if (dateFilter.$lte) {
        //         const endDate = new Date(`${dateFilter.$lte}T06:00:00.000Z`);
        //         endDate.setTime(endDate.getTime() + 24 * 60 * 60 * 1000 - 1); // Add 24 hours minus 1 millisecond
        //         dateFilter.$lte = endDate.toISOString();
        //     }
        // }

        const { data, meta } = await super.find(ctx);

        const userId = ctx.state.user?.id;
        if (!userId) {
            return { data, meta };
        }

        // Resolve the person record linked to this user
        const persons = await strapi.documents('api::person.person').findMany({
            filters: { user: { id: userId } },
            fields: ['documentId'],
        });

        const person = persons[0];
        if (!person) {
            return { data, meta };
        }

        // Collect event documentIds from the current page
        const eventDocumentIds = data.map((e) => e.documentId);
        if (eventDocumentIds.length === 0) {
            return { data, meta };
        }

        // Fetch attendances for this person scoped to the returned events
        const attendances = await strapi.documents('api::attendance.attendance').findMany({
            filters: {
                person: { documentId: person.documentId },
                event: { documentId: { $in: eventDocumentIds } },
            },
            fields: ['documentId', 'status', 'response_date', 'notes', 'is_present', 'attended_date', 'invited_date', 'reminder_sent'],
            populate: { event: { fields: ['documentId'] } },
        });

        // Index attendances by event documentId for O(1) lookup
        const attendanceByEvent = {};
        for (const attendance of attendances) {
            if (attendance.event?.documentId) {
                attendanceByEvent[attendance.event.documentId] = attendance;
            }
        }

        // Append myAttendance to each event entry
        const enrichedData = data.map((event) => ({
            ...event,
            my_attendance: attendanceByEvent[event.documentId] ?? null,
        }));

        return { data: enrichedData, meta };
    },

    // Generar PDF de portada para evento
    async generatePDF(ctx) {
        const { id } = ctx.params;

        try {
            if (!id) {
                return ctx.badRequest('Event ID is required');
            }

            // Verificar que el evento existe (incluyendo el coro relacionado)
            const event = await strapi.documents('api::event.event').findOne({
                documentId: id,
                fields: ['name', 'event_date'],
                populate: { coro: { fields: ['id'] } }
            });

            if (!event) {
                return ctx.notFound('Event not found');
            }

            // Generar PDF
            let pdfBuffer;

            try {
                pdfBuffer = await strapi
                    .service('api::event.pdf-generator')
                    .generateEventPDF(id);
            } catch (pdfError) {
                strapi.log.error('PDF generation failed:', pdfError);
                ctx.throw(500, 'Fatal error generating PDF');
            }

            // Construir nombre de archivo: YYMMDD_HH:MM_<EventName>.pdf
            let filename = event.name.trim().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').toLowerCase();

            if (event.coro) {
                let formattedCoroId = String(event.coro.id).padStart(3, '0');
                filename = `${formattedCoroId}-${filename}`;
            }

            if (event.event_date) {
                const eventDateTime = new Date(event.event_date);
                const formatter = new Intl.DateTimeFormat('es-MX', {
                    timeZone: 'America/Monterrey',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                const parts = formatter.formatToParts(eventDateTime);
                const partsMap = Object.fromEntries(parts.map(p => [p.type, p.value]));

                const year = partsMap.year.slice(-2);
                const month = partsMap.month;
                const day = partsMap.day;
                const hours = partsMap.hour;
                const minutes = partsMap.minute;

                filename = `${year}${month}${day}_${hours}${minutes}-${filename}`;
            }

            filename = `${filename}.pdf`;

            // Enviar PDF
            ctx.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length,
                'Access-Control-Expose-Headers': 'Content-Disposition'
            });

            ctx.body = pdfBuffer;
        } catch (error) {
            strapi.log.error('Fatal error in generatePDF:', error);
            ctx.throw(500, 'Fatal error generating PDF');
        }
    },
}));
