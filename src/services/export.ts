import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import type { DailyLog } from '../types';
import type { ExpenseRates } from '../utils/expenseConfiguration';

export const ExportService = {
    exportDailyLogToExcel: (
        log: DailyLog,
        t: (key: string) => string,
        dateLocale: any,
        rates: ExpenseRates
    ) => {
        // --- 1. Header Info ---
        const wb = XLSX.utils.book_new();
        const wsData: any[][] = [];

        // Title
        wsData.push([t('export.reportTitle')]);
        wsData.push([`${t('export.datePrefix')}${format(parseISO(log.date), 'EEEE dd MMMM yyyy', { locale: dateLocale })}`]);
        wsData.push([]); // Empty row

        // --- 2. Global Stats ---
        wsData.push([t('export.generalSummary')]);
        // Calculate totals if stats are empty/zero (optional fallback)
        const stats = log.stats || {
            totalDriveMinutes: 0,
            totalWorkMinutes: 0,
            amplitudeMinutes: 0
        };

        const formatDuration = (mins: number) => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${h}h${String(m).padStart(2, '0')}`;
        };

        wsData.push([t('export.totalDrive'), formatDuration(stats.totalDriveMinutes)]);
        wsData.push([t('export.totalWork'), formatDuration(stats.totalWorkMinutes)]);
        wsData.push([t('export.amplitude'), formatDuration(stats.amplitudeMinutes)]);
        wsData.push([]);

        // --- 3. Missions / Segments ---
        wsData.push([t('export.missionsClients')]);
        wsData.push([t('export.startTime'), t('dashboard.client'), t('dashboard.route'), t('dashboard.cargo')]);

        const segments = log.segments || (log.context.client ? [{ startTime: log.events[0]?.startTime || log.date, context: log.context }] : []);

        segments.forEach(seg => {
            wsData.push([
                seg.startTime ? format(parseISO(seg.startTime), 'HH:mm') : '-',
                seg.context.client || '-',
                seg.context.route || '-',
                seg.context.cargo || '-'
            ]);
        });
        wsData.push([]);

        // --- 4. Activities Detail (Grouped by Segment) ---
        wsData.push([t('export.missionDetails')]);
        wsData.push([]); // Spacer

        // Ensure segments are sorted
        const sortedSegments = [...segments].sort((a, b) => a.startTime.localeCompare(b.startTime));
        // Ensure events are sorted
        const sortedEvents = [...log.events].sort((a, b) => a.startTime.localeCompare(b.startTime));

        sortedSegments.forEach((seg, index) => {
            const nextSeg = sortedSegments[index + 1];
            const segStart = new Date(seg.startTime).getTime();
            const segEnd = nextSeg ? new Date(nextSeg.startTime).getTime() : Infinity;

            // Filter events for this segment
            const segmentEvents = sortedEvents.filter(e => {
                const t = new Date(e.startTime).getTime();
                return t >= segStart && t < segEnd;
            });

            // Segment Header
            wsData.push([`${t('export.missionPrefix')} : ${seg.context.client || t('export.unknownClient')} (${seg.context.route || t('export.unknownRoute')})`]);
            if (seg.context.cargo) wsData.push([`${t('export.cargoPrefix')} : ${seg.context.cargo}`]);

            // Column Headers per segment
            wsData.push([t('export.startTime'), t('export.endTime'), t('export.duration'), t('export.activity'), t('export.note')]);

            if (segmentEvents.length === 0) {
                wsData.push(["-", "-", "-", t('export.noActivity'), "-"]);
            } else {
                segmentEvents.forEach(event => {
                    const start = event.startTime ? format(parseISO(event.startTime), 'HH:mm') : '-';
                    const end = event.endTime ? format(parseISO(event.endTime), 'HH:mm') : t('export.ongoing');

                    let typeLabel: string = event.type;
                    switch (event.type) {
                        case 'Drive': typeLabel = t('status.drive'); break;
                        case 'Work': typeLabel = t('status.work'); break;
                        case 'Available': typeLabel = t('status.available'); break;
                        case 'Rest': typeLabel = t('status.rest'); break;
                    }

                    wsData.push([
                        start,
                        end,
                        event.duration ? `${event.duration} min` : '-',
                        typeLabel,
                        event.note || ''
                    ]);
                });
            }
            wsData.push([]); // Empty row
        });

        // Handle events BEFORE the first segment
        if (sortedSegments.length > 0) {
            const firstSegStart = new Date(sortedSegments[0].startTime).getTime();
            const orphanEvents = sortedEvents.filter(e => new Date(e.startTime).getTime() < firstSegStart);

            if (orphanEvents.length > 0) {
                wsData.push([t('export.preliminaryActivities')]);
                wsData.push([t('export.startTime'), t('export.endTime'), t('export.duration'), t('export.activity'), t('export.note')]);
                orphanEvents.forEach(event => {
                    const start = event.startTime ? format(parseISO(event.startTime), 'HH:mm') : '-';
                    const end = event.endTime ? format(parseISO(event.endTime), 'HH:mm') : t('export.ongoing');
                    let typeLabel: string = event.type;
                    switch (event.type) {
                        case 'Drive': typeLabel = t('status.drive'); break;
                        case 'Work': typeLabel = t('status.work'); break;
                        case 'Available': typeLabel = t('status.available'); break;
                        case 'Rest': typeLabel = t('status.rest'); break;
                    }
                    wsData.push([start, end, event.duration ? `${event.duration} min` : '-', typeLabel, event.note || '']);
                });
                wsData.push([]);
            }
        } else if (sortedEvents.length > 0 && sortedSegments.length === 0) {
            // Fallback if no segments at all
            sortedEvents.forEach(event => {
                const start = event.startTime ? format(parseISO(event.startTime), 'HH:mm') : '-';
                const end = event.endTime ? format(parseISO(event.endTime), 'HH:mm') : t('export.ongoing');
                let typeLabel: string = event.type;
                switch (event.type) {
                    case 'Drive': typeLabel = t('status.drive'); break;
                    case 'Work': typeLabel = t('status.work'); break;
                    case 'Available': typeLabel = t('status.available'); break;
                    case 'Rest': typeLabel = t('status.rest'); break;
                }
                wsData.push([start, end, event.duration ? `${event.duration} min` : '-', typeLabel, event.note || '']);
            });
        }

        // --- 5. Expenses ---
        wsData.push([t('export.roadExpenses')]);
        const expenses = log.expenses || { meals: 0, decouches: 'none', totalAmount: 0 };
        wsData.push([`${t('dashboard.meals')} (${rates.meal.toFixed(2)}€)`, expenses.meals]);

        let decoucheLabel = t('expenses.none');
        if (expenses.decouches === 'france') decoucheLabel = `${rates.domesticLabel} (${rates.domesticNight}€)`;
        else if (expenses.decouches === 'europe') decoucheLabel = `${t('expenses.europe')} (${rates.europeNight}€)`;

        wsData.push([t('dashboard.overnight'), decoucheLabel]);
        wsData.push([t('export.totalExpenses'), `${expenses.totalAmount?.toFixed(2)} €`]);

        // Create Sheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Styling widths
        ws['!cols'] = [
            { wch: 15 }, // Col A
            { wch: 25 }, // Col B
            { wch: 25 }, // Col C
            { wch: 20 }, // Col D
            { wch: 30 }  // Col E
        ];

        XLSX.utils.book_append_sheet(wb, ws, t('excel.filename'));

        // Generate Filename
        const filename = `${t('excel.filename')}_${log.date}.xlsx`;

        // Write file
        XLSX.writeFile(wb, filename);
    }
};
