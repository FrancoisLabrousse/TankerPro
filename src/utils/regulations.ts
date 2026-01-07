import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import type { DailyLog } from '../types';

export const getWeeklyStats = (logs: DailyLog[], today: Date) => {
    // Determine current week (Monday start)
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const end = endOfWeek(today, { weekStartsOn: 1 });

    // Filter logs for this week
    const weeklyLogs = logs.filter(log => {
        const logDate = parseISO(log.date);
        return isWithinInterval(logDate, { start, end });
    });

    let extendedDriveDays = 0;
    let reducedRestDays = 0;

    weeklyLogs.forEach(log => {
        // Extended Drive (> 9h = 540 min)
        if (log.stats.totalDriveMinutes > 540) {
            extendedDriveDays++;
        }

        // Reduced Rest (< 11h or triggered by Amplitude > 13h)
        // Proxy: If Amplitude > 13h (780 min), it forces a reduced rest.
        // Or if we can strictly detect a rest < 11h (660 min) but > 9h.
        // For now, let's stick to the user's rule: "Amplitude > 13h => Reduced Rest used".
        if (log.stats.amplitudeMinutes > 780) {
            reducedRestDays++;
        }
    });

    // Calculate total drive minutes for current week
    const weeklyDriveMinutes = weeklyLogs.reduce((acc, log) => acc + log.stats.totalDriveMinutes, 0);

    // Calculate previous week stats for bi-weekly limit
    const prevStart = startOfWeek(new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
    const prevEnd = endOfWeek(new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });

    const prevWeeklyLogs = logs.filter(log => {
        const logDate = parseISO(log.date);
        return isWithinInterval(logDate, { start: prevStart, end: prevEnd });
    });

    const prevWeeklyDriveMinutes = prevWeeklyLogs.reduce((acc, log) => acc + log.stats.totalDriveMinutes, 0);
    const biWeeklyDriveMinutes = weeklyDriveMinutes + prevWeeklyDriveMinutes;

    return {
        extendedDriveDays,
        reducedRestDays,
        weeklyLogsCount: weeklyLogs.length,
        weeklyDriveMinutes,
        biWeeklyDriveMinutes
    };
};
