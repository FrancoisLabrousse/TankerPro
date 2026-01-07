import type { DailyLog, AppState } from '../types';

const STORAGE_KEY = 'tankerpro_data_v1';

const defaultState: AppState = {
    currentStatus: 'Idle',
    lastStatusChange: new Date().toISOString(),
    currentDayLog: null,
    dailyLogs: {}
};

export const StorageService = {
    saveState: (state: AppState) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    },

    loadState: (): AppState => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load state:', error);
        }
        return defaultState;
    },

    getAllLogs: (): DailyLog[] => {
        const state = StorageService.loadState();
        const logs = Object.values(state.dailyLogs);

        // Include current day log if it exists and isn't already in dailyLogs
        if (state.currentDayLog) {
            const exists = logs.find(l => l.date === state.currentDayLog?.date);
            if (!exists) {
                logs.push(state.currentDayLog);
            } else {
                // If it exists (e.g. valid 'today' is in dailyLogs? shouldn't be if it's active)
                // Actually if we save periodically, it might be.
                // But let's assume currentDayLog is the authority for Today.
                // Replace the existing one with currentDayLog
                const index = logs.findIndex(l => l.date === state.currentDayLog?.date);
                if (index !== -1) {
                    logs[index] = state.currentDayLog;
                }
            }
        }

        return logs.sort((a, b) => b.date.localeCompare(a.date));
    },

    saveDayLog: (log: DailyLog) => {
        const state = StorageService.loadState();
        state.dailyLogs[log.date] = log;

        // Also update currentDayLog if it matches the edited log
        if (state.currentDayLog && state.currentDayLog.id === log.id) {
            state.currentDayLog = log;
        }

        StorageService.saveState(state);
    },

    getDayLog: (date: string): DailyLog | null => {
        const state = StorageService.loadState();
        return state.dailyLogs[date] || null;
    },

    deleteLogs: (logDates: string[]) => {
        const state = StorageService.loadState();

        logDates.forEach(date => {
            delete state.dailyLogs[date];
            // If deleting the current active day, we should probably reset currentDayLog?
            // Or just leave it detached? Safer to detach if it matches.
            if (state.currentDayLog && state.currentDayLog.date === date) {
                state.currentDayLog = null;
                state.currentStatus = 'Idle';
                state.lastStatusChange = new Date().toISOString();
            }
        });

        StorageService.saveState(state);
    }
};
