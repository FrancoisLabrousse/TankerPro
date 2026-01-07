import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { ShiftInfoCard } from './ShiftInfoCard';
import { TachoControls } from './TachoControls';
import { ActivityFeed } from './ActivityFeed';
import { ExpensesCard } from './ExpensesCard';
import { BreakTimer } from './BreakTimer';
import { RegulationStatus } from './RegulationStatus';
import { StorageService } from '../../services/storage';
import { getWeeklyStats } from '../../utils/regulations';
import type { AppState, DailyLog, ShiftContext, TachographEvent } from '../../types';
import { differenceInMinutes, format } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';

export const Dashboard = () => {
    const { t, dateLocale } = useLanguage();
    const [state, setState] = useState<AppState>(StorageService.loadState());
    const [now, setNow] = useState(new Date());

    // Timer for updating "Now" every minute to refresh stats
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(interval);
    }, []);

    // Initialize day or roll over if date changed
    useEffect(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        // Check if we have a stale log from a previous day
        if (state.currentDayLog && state.currentDayLog.date !== todayStr) {
            // Archive the stale log
            const staleLog = state.currentDayLog;
            // Optionally close the last event? For now just save as is.
            StorageService.saveDayLog(staleLog);

            // Start fresh
            const newLog: DailyLog = {
                id: todayStr,
                date: todayStr,
                context: { client: '', route: '', cargo: '' },
                segments: [{ startTime: new Date().toISOString(), context: { client: '', route: '', cargo: '' } }],
                events: [],
                stats: {
                    totalDriveMinutes: 0,
                    totalWorkMinutes: 0,
                    totalAvailableMinutes: 0,
                    totalRestMinutes: 0,
                    amplitudeMinutes: 0
                },
                expenses: { meals: 0, decouches: 'none', totalAmount: 0 },
                purchases: []
            };

            updateState({
                currentDayLog: newLog,
                currentStatus: 'Idle',
                lastStatusChange: new Date().toISOString()
            });
            return;
        }

        if (!state.currentDayLog) {
            const newLog: DailyLog = {
                id: todayStr,
                date: todayStr,
                context: { client: '', route: '', cargo: '' },
                segments: [{ startTime: new Date().toISOString(), context: { client: '', route: '', cargo: '' } }],
                events: [],
                stats: {
                    totalDriveMinutes: 0,
                    totalWorkMinutes: 0,
                    totalAvailableMinutes: 0,
                    totalRestMinutes: 0,
                    amplitudeMinutes: 0
                },
                expenses: { meals: 0, decouches: 'none', totalAmount: 0 },
                purchases: []
            };
            updateState({ currentDayLog: newLog, currentStatus: 'Idle', lastStatusChange: new Date().toISOString() });
        } else {
            // SYNC FIX: Ensure currentDayLog has the latest purchases from dailyLogs
            // (In case they were saved to dailyLogs but not synced to currentDayLog)
            const storedLog = state.dailyLogs[state.currentDayLog.date];
            if (storedLog && storedLog.purchases && storedLog.purchases.length > (state.currentDayLog.purchases?.length || 0)) {
                updateState({
                    currentDayLog: {
                        ...state.currentDayLog,
                        purchases: storedLog.purchases
                    }
                });
            }
        }
    }, []); // Run once on mount

    const updateState = (updates: Partial<AppState>) => {
        const newState = { ...state, ...updates };
        setState(newState);
        StorageService.saveState(newState);
    };

    const handleShiftUpdate = (context: ShiftContext) => {
        if (!state.currentDayLog) return;

        // Update the LATEST segment
        const segments = [...(state.currentDayLog.segments || [])];
        if (segments.length === 0) {
            segments.push({ startTime: new Date().toISOString(), context });
        } else {
            segments[segments.length - 1] = { ...segments[segments.length - 1], context };
        }

        updateState({
            currentDayLog: {
                ...state.currentDayLog,
                context, // Update "active" context
                segments
            }
        });
    };

    const handleNewSegment = () => {
        if (!state.currentDayLog) return;

        const newContext: ShiftContext = { client: '', route: '', cargo: '' };
        const newSegment = { startTime: new Date().toISOString(), context: newContext };
        const segments = [...(state.currentDayLog.segments || []), newSegment];

        updateState({
            currentDayLog: {
                ...state.currentDayLog,
                context: newContext,
                segments
            }
        });
    };

    const handleStatusChange = (newStatus: 'Drive' | 'Work' | 'Available' | 'Rest') => {
        if (newStatus === state.currentStatus) return;

        const timestamp = new Date().toISOString();
        const event: TachographEvent = {
            type: state.currentStatus as any,
            startTime: state.lastStatusChange,
            endTime: timestamp,
            duration: differenceInMinutes(new Date(timestamp), new Date(state.lastStatusChange))
        };

        // Add event to current log if it wasn't Idle
        let updatedEvents = state.currentDayLog?.events || [];
        if (event.type !== ('Idle' as any)) {
            updatedEvents = [...updatedEvents, event];
        }

        // Calculate new stats
        const newStats = {
            totalDriveMinutes: 0,
            totalWorkMinutes: 0,
            totalAvailableMinutes: 0,
            totalRestMinutes: 0,
            amplitudeMinutes: 0,
            startTime: state.currentDayLog?.stats.startTime,
            endTime: state.currentDayLog?.stats.endTime
        };

        if (updatedEvents.length > 0) {
            updatedEvents.forEach(e => {
                if (e.type === 'Drive') newStats.totalDriveMinutes += (e.duration || 0);
                if (e.type === 'Work') newStats.totalWorkMinutes += (e.duration || 0);
                if (e.type === 'Available') newStats.totalAvailableMinutes += (e.duration || 0);
                if (e.type === 'Rest') newStats.totalRestMinutes += (e.duration || 0);
            });

            // Amplitude
            const start = new Date(updatedEvents[0].startTime);
            const last = updatedEvents[updatedEvents.length - 1];
            const end = last.endTime ? new Date(last.endTime) : new Date(last.startTime);
            newStats.amplitudeMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);

            if (!newStats.startTime) newStats.startTime = updatedEvents[0].startTime;
        }

        updateState({
            currentStatus: newStatus,
            lastStatusChange: timestamp,
            currentDayLog: state.currentDayLog ? {
                ...state.currentDayLog,
                events: updatedEvents,
                stats: newStats
            } : null
        });
    };

    const handleEventUpdate = (index: number, note: string) => {
        if (!state.currentDayLog) return;

        const updatedEvents = [...state.currentDayLog.events];
        if (updatedEvents[index]) {
            updatedEvents[index] = { ...updatedEvents[index], note };

            updateState({
                currentDayLog: {
                    ...state.currentDayLog,
                    events: updatedEvents
                }
            });
        }
    };

    // Live Stats Calculation
    const calculateStats = useCallback((events: TachographEvent[], currentStatus: string, lastChange: string) => {
        let drive = 0;
        let work = 0;
        let available = 0;
        let rest = 0;

        // Sum past events
        events.forEach(e => {
            if (e.type === 'Drive') drive += (e.duration || 0);
            if (e.type === 'Work') work += (e.duration || 0);
            if (e.type === 'Available') available += (e.duration || 0);
            if (e.type === 'Rest') rest += (e.duration || 0);
        });

        // Add current elapsed
        const currentDuration = differenceInMinutes(now, new Date(lastChange));

        if (currentStatus === 'Drive') drive += currentDuration;
        else if (currentStatus === 'Work') work += currentDuration;
        else if (currentStatus === 'Available') available += currentDuration;
        else if (currentStatus === 'Rest') rest += currentDuration;

        // Amplitude
        let amplitude = 0;
        const allStarts = events.map(e => new Date(e.startTime).getTime());
        if (currentStatus !== 'Idle') allStarts.push(new Date(lastChange).getTime());

        if (allStarts.length > 0) {
            const start = Math.min(...allStarts);
            amplitude = differenceInMinutes(now, start);
        }

        return {
            totalDrive: drive,
            totalWork: work,
            totalAvailable: available,
            totalRest: rest,
            amplitude
        };
    }, [now]);

    const liveStats = state.currentDayLog
        ? calculateStats(state.currentDayLog.events, state.currentStatus, state.lastStatusChange)
        : { totalDrive: 0, totalWork: 0, totalAvailable: 0, totalRest: 0, amplitude: 0 };

    // Keep ref updated for unmount cleanup
    const liveStatsRef = useRef(liveStats);
    useEffect(() => {
        liveStatsRef.current = liveStats;
    }, [liveStats]);

    // Save stats on unmount (when switching tabs)
    // useLayoutEffect ensures this runs synchronously before the new component paints
    useLayoutEffect(() => {
        return () => {
            const latestStats = liveStatsRef.current;
            // We load fresh state to avoid stale closure issues, but we only update the stats of the current day
            const savedState = StorageService.loadState();

            if (savedState.currentDayLog) {
                const updatedLog = {
                    ...savedState.currentDayLog,
                    stats: {
                        ...savedState.currentDayLog.stats,
                        totalDriveMinutes: latestStats.totalDrive,
                        totalWorkMinutes: latestStats.totalWork,
                        totalAvailableMinutes: latestStats.totalAvailable,
                        totalRestMinutes: latestStats.totalRest,
                        amplitudeMinutes: latestStats.amplitude
                    }
                };

                savedState.currentDayLog = updatedLog;
                // Also update in the dailyLogs map if present
                if (savedState.dailyLogs[updatedLog.date]) {
                    savedState.dailyLogs[updatedLog.date] = updatedLog;
                }

                StorageService.saveState(savedState);
            }
        };
    }, []);

    if (!state.currentDayLog) return <div className="p-4 text-center">Chargement...</div>;

    return (
        <div className="p-4 space-y-6 pb-24">
            <header className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">TankerPro</h1>
                    <p className="text-xs text-slate-400 first-letter:capitalize">
                        {format(now, 'EEEE d MMMM yyyy', { locale: dateLocale })}
                    </p>
                </div>
                <div className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                    <span className="text-xs font-mono text-indigo-300">
                        {t(state.currentStatus !== 'Idle' ? 'dashboard.statusService' : 'dashboard.statusOutOfService')}
                    </span>
                </div>
            </header>

            {/* Break Timer */}
            <BreakTimer
                events={state.currentDayLog.events}
                currentStatus={state.currentStatus}
                lastStatusChange={state.lastStatusChange}
            />


            <ShiftInfoCard
                data={state.currentDayLog.context}
                onUpdate={handleShiftUpdate}
                onNewSegment={handleNewSegment}
            />

            <TachoControls
                status={state.currentStatus}
                lastChange={state.lastStatusChange}
                stats={{
                    totalDrive: liveStats.totalDrive,
                    amplitude: liveStats.amplitude
                }}
                onStatusChange={handleStatusChange}
            />

            <ActivityFeed
                events={state.currentDayLog.events}
                segments={state.currentDayLog.segments}
                onUpdateEvent={handleEventUpdate}
            />

            <ExpensesCard
                expenses={state.currentDayLog.expenses}
                onUpdate={(ex) => state.currentDayLog && updateState({
                    currentDayLog: { ...state.currentDayLog, expenses: ex }
                })}
            />

            {/* Weekly Regulations */}
            <RegulationStatus
                driveExtensionsUsed={getWeeklyStats(StorageService.getAllLogs(), now).extendedDriveDays}
                reducedRestsUsed={getWeeklyStats(StorageService.getAllLogs(), now).reducedRestDays}
                currentAmplitude={liveStats.amplitude}
                currentDrive={liveStats.totalDrive}
                weeklyDrive={getWeeklyStats(StorageService.getAllLogs(), now).weeklyDriveMinutes}
                biWeeklyDrive={getWeeklyStats(StorageService.getAllLogs(), now).biWeeklyDriveMinutes}
            />
        </div>
    );
};
