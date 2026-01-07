export interface TachographEvent {
    type: 'Drive' | 'Work' | 'Available' | 'Rest';
    startTime: string; // ISO string
    endTime?: string; // ISO string
    duration?: number; // In minutes
    note?: string; // Manual note
}

export interface ShiftContext {
    client: string;
    route: string;
    cargo: string;
    notes?: string;
}

export interface ShiftSegment {
    startTime: string; // ISO string
    context: ShiftContext;
}

export interface Expenses {
    meals: number; // Count of meals (16.50€)
    decouches: 'none' | 'france' | 'europe'; // 50€ (France) or 65€ (Europe)
    totalAmount: number;
}

export interface Purchase {
    id: string;
    date: string; // YYYY-MM-DD
    description: string;
    amount: number;
}

export interface DailyLog {
    id: string; // YYYY-MM-DD
    date: string; // YYYY-MM-DD
    context: ShiftContext; // The ACTIVE/LATEST context (for backward compat)
    segments: ShiftSegment[]; // All segments for the day
    events: TachographEvent[];
    stats: {
        totalDriveMinutes: number;
        totalWorkMinutes: number;
        totalAvailableMinutes: number;
        totalRestMinutes: number;
        amplitudeMinutes: number;
        startTime?: string;
        endTime?: string;
    };
    expenses: Expenses;
    purchases: Purchase[]; // Personal spending
}

export interface AppState {
    currentStatus: 'Drive' | 'Work' | 'Available' | 'Rest' | 'Idle';
    lastStatusChange: string; // ISO string
    currentDayLog: DailyLog | null; // The active shift being recorded
    dailyLogs: Record<string, DailyLog>; // Keyed by date YYYY-MM-DD
}
