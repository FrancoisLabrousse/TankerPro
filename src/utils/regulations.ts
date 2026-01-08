import { startOfWeek, endOfWeek, isWithinInterval, parseISO, differenceInMinutes } from 'date-fns';
import type { DailyLog, TachographEvent } from '../types';

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

export const calculateContinuousStats = (
    events: TachographEvent[],
    currentStatus: 'Drive' | 'Work' | 'Available' | 'Rest' | 'Idle',
    lastChange: string,
    now: Date = new Date()
) => {
    let drive = 0;
    let work = 0;
    let available = 0;
    let rest = 0;
    let service = 0;
    let amplitude = 0;

    let continuousDrive = 0;
    let continuousService = 0;

    // Helper to simulate event processing
    // specific logic for splits: 
    // Drive break: 45m continuous OR (15m then 30m).
    // Service break: 30m continuous (some rules say 30, user specifically said 30).

    // We need to replay events to track "continuous" counters properly.
    // For Split Break (15+30), we need to track if we found a valid "first part" (>=15m) since last full reset.
    let validSplit15Found = false;

    // Merge current status into a temporary list for calculation
    const allEvents = [...events];
    if (currentStatus !== 'Idle') {
        allEvents.push({
            type: currentStatus,
            startTime: lastChange,
            endTime: now.toISOString(),
            duration: differenceInMinutes(now, new Date(lastChange))
        });
    }

    if (allEvents.length === 0) return {
        totalDrive: 0, totalWork: 0, totalAvailable: 0, totalRest: 0,
        totalService: 0, amplitude: 0, continuousDrive: 0, continuousService: 0
    };

    allEvents.forEach((e) => {
        const duration = e.duration || 0;

        // 1. Accumulate Totals
        if (e.type === 'Drive') drive += duration;
        if (e.type === 'Work') work += duration;
        if (e.type === 'Available') available += duration;
        if (e.type === 'Rest') rest += duration;

        // Service = Drive + Work + Available
        if (e.type === 'Drive' || e.type === 'Work' || e.type === 'Available') {
            service += duration;
        }

        // 2. Continuous Drive Logic
        if (e.type === 'Drive') {
            continuousDrive += duration;
        } else if (e.type === 'Rest' || e.type === 'Available') { // Available often counts as break for driving time in some contexts, but usually specifically Rest. Let's assume Rest + Available >= Break? No, usually just Rest/Pause. User said 'repos'.
            // Simplification: strict Rest or Available (if "squares" mode). Let's stick to Rest for safety, or both. 
            // Reg 561/2006: Break = period where driver may not carry out any driving or any other work. Available IS allowed as break if known in advance, but usually Rest is safer.
            // Let's count Rest AND Available as potential breaks for Driving calculation? 
            // Actually, usually Available is NOT a break from "Service", but CAN be a break from "Driving". 
            // However, for "Service" reset, user said "coupure".

            // Let's treat Rest and Available as "Break time" for DRIVING counters. 
            // But for SERVICE counters, usually only REST counts (since Available is often paid/service).
            // User Request: "temps de service (travail+dispo+conduite)". So Available IS Service.
            // Therefore, ONLY 'Rest' resets Service.

            // Driving Break Logic (45m or 15+30)
            if (e.type === 'Rest' || e.type === 'Available') {
                // Available is debatable, but often in apps it's treated specifically. 
                // Given user formula for Service includes Available, Available likely DOES NOT reset Service. 
                // Does Available reset Driving? Only if it's "Pause". 
                // Let's assume ONLY 'Rest' resets Driving to be safe, unless user complains.
                // Wait, if I am "Available" (waiting for ferry), I am not driving. 
                // But normally 45m break must be "Pause/Repos".

                if (e.type === 'Rest') { // Strict Rest for resetting
                    if (duration >= 45) {
                        continuousDrive = 0;
                        validSplit15Found = false;
                    } else if (duration >= 30 && validSplit15Found) {
                        // Completed 15+30 split
                        continuousDrive = 0;
                        validSplit15Found = false;
                    } else if (duration >= 15 && duration < 45) {
                        // Potential first part of split
                        // But we only count it if we haven't already driven too much? 
                        // Actually, you can take 15m anytime.
                        validSplit15Found = true;
                        // Note simple logic: finding a 15m break just sets the flag. 
                        // The drive *between* 15 and 30 doesn't reset, but once 30 hits, it resets ALL valid drive since? 
                        // Actually reg says: break can be split into 15+30. 
                        // Implementing strict regulation logic is complex. 
                        // Simplified: If Rest >= 45, reset.
                    }
                }
            }
        }

        // 3. Continuous Service Logic
        // Resets if Rest >= 30m (User rule)
        if (e.type === 'Rest') {
            if (duration >= 30) {
                continuousService = 0;
            }
        } else {
            // Drive, Work, Available -> All add to Service
            continuousService += duration;
        }
    });

    // Amplitude
    const start = new Date(allEvents[0].startTime).getTime();
    // End is 'now' since we included current status event
    amplitude = differenceInMinutes(now, start);

    return {
        totalDrive: drive,
        totalWork: work,
        totalAvailable: available,
        totalRest: rest,
        totalService: service,
        amplitude,
        continuousDrive,
        continuousService
    };
};
