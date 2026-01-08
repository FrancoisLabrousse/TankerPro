import { getWeeklyStats, calculateContinuousStats } from '../../utils/regulations';
import type { AppState, DailyLog, ShiftContext, TachographEvent } from '../../types';
import { differenceInMinutes, format } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';

export const Dashboard = () => {
    const { t, dateLocale } = useLanguage();
    const [state, setState] = useState<AppState>(StorageService.loadState());
    const [now, setNow] = useState(new Date());

    // ... (keep useEffects)

    // Calculate live stats using the shared utility
    const liveStats = state.currentDayLog
        ? calculateContinuousStats(
            state.currentDayLog.events,
            state.currentStatus,
            state.lastStatusChange,
            now
        )
        : {
            totalDrive: 0, totalWork: 0, totalAvailable: 0, totalRest: 0, totalService: 0,
            amplitude: 0, continuousDrive: 0, continuousService: 0
        };

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
