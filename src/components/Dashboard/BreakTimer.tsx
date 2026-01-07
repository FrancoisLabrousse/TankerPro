import { useState, useEffect } from 'react';
import { differenceInMinutes } from 'date-fns';
import { Timer, AlertTriangle } from 'lucide-react';
import type { TachographEvent } from '../../types';
import clsx from 'clsx';

interface Props {
    events: TachographEvent[];
    currentStatus: string;
    lastStatusChange: string;
}

export const BreakTimer = ({ events, currentStatus, lastStatusChange }: Props) => {
    const [timeState, setTimeState] = useState<{
        remainingMinutes: number;
        reason: string;
        severity: 'normal' | 'warning' | 'critical';
    }>({ remainingMinutes: 270, reason: '', severity: 'normal' });

    useEffect(() => {
        const calculateRemaining = () => {
            // Limits
            const MAX_DRIVE = 4 * 60 + 30; // 4h30 -> 270 min
            const MAX_SERVICE = 6 * 60;    // 6h00 -> 360 min

            let continuousDrive = 0;
            let continuousService = 0;

            // Track if a valid partial break (>=15 min) has occurred to enable the 15+30 split rule
            let hasPartialBreak = false;

            // Sort events chronologically to replay the day
            const sortedEvents = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));

            for (const event of sortedEvents) {
                const duration = event.duration || 0;

                // Reset logic
                if (event.type === 'Rest') {
                    if (duration >= 45) {
                        // Full reset
                        continuousDrive = 0;
                        continuousService = 0;
                        hasPartialBreak = false;
                    } else if (duration >= 30) {
                        // Service reset (6h rule) - Always valid with 30m
                        continuousService = 0;

                        // Drive reset ONLY if we already had a partial break (Split rule: 15+30)
                        if (hasPartialBreak) {
                            continuousDrive = 0;
                            hasPartialBreak = false; // Consumed the split usage
                        } else {
                            // This 30m break can serve as the first "15m" part for a future split
                            // This means a sequence of 30m...30m is valid (as the first 30m > 15m)
                            hasPartialBreak = true;
                        }
                    } else if (duration >= 15) {
                        // Valid first part of a split break
                        hasPartialBreak = true;
                    }
                }

                // Accumulate
                if (event.type === 'Drive') {
                    continuousDrive += duration;
                    continuousService += duration;
                } else if (event.type === 'Work' || event.type === 'Available') {
                    continuousService += duration;
                }
            }

            // Add current live activity duration
            const currentDuration = differenceInMinutes(new Date(), new Date(lastStatusChange));

            if (currentStatus === 'Drive') {
                continuousDrive += currentDuration;
                continuousService += currentDuration;
            } else if (currentStatus === 'Work' || currentStatus === 'Available') {
                continuousService += currentDuration;
            } else if (currentStatus === 'Rest') {
                // If currently resting, check against thresholds for LIVE display
                if (currentDuration >= 45) {
                    continuousDrive = 0;
                    continuousService = 0;
                } else if (currentDuration >= 30) {
                    continuousService = 0;
                    if (hasPartialBreak) {
                        continuousDrive = 0;
                    }
                }
            }

            // Calculate Remaining
            const remainingDrive = MAX_DRIVE - continuousDrive;
            const remainingService = MAX_SERVICE - continuousService;

            let finalRemaining = 0;
            let reason = '';

            if (remainingDrive < remainingService) {
                finalRemaining = remainingDrive;
                reason = '(Conduite)';
            } else {
                finalRemaining = remainingService;
                reason = '(Service)';
            }

            // Severity
            let severity: 'normal' | 'warning' | 'critical' = 'normal';
            if (finalRemaining <= 0) severity = 'critical';
            else if (finalRemaining <= 30) severity = 'warning';

            setTimeState({
                remainingMinutes: finalRemaining,
                reason,
                severity
            });
        };

        calculateRemaining();
        const interval = setInterval(calculateRemaining, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [events, currentStatus, lastStatusChange]);

    const formatTime = (totalMinutes: number) => {
        if (totalMinutes === 0) return "0h00";
        const h = Math.floor(Math.abs(totalMinutes) / 60);
        const m = Math.abs(totalMinutes) % 60;
        return `${h}h${String(m).padStart(2, '0')}`;
    };

    const isOvertime = timeState.remainingMinutes < 0;
    const displayTime = isOvertime
        ? `-${formatTime(timeState.remainingMinutes)}`
        : formatTime(timeState.remainingMinutes);

    return (
        <div className={clsx(
            "rounded-xl p-4 border shadow-lg transition-all mb-4 flex items-center justify-between",
            timeState.severity === 'normal' && "bg-slate-800 border-slate-700",
            timeState.severity === 'warning' && "bg-orange-900/40 border-orange-500/50",
            timeState.severity === 'critical' && "bg-red-900/40 border-red-500/50 animate-pulse"
        )}>
            <div className="flex items-center gap-3">
                <div className={clsx(
                    "p-2 rounded-lg",
                    timeState.severity === 'normal' ? "bg-slate-700 text-slate-300" :
                        timeState.severity === 'warning' ? "bg-orange-500/20 text-orange-400" :
                            "bg-red-500/20 text-red-400"
                )}>
                    {timeState.severity === 'critical' ? <AlertTriangle size={24} /> : <Timer size={24} />}
                </div>
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {isOvertime ? "DÉPASSEMENT PAUSE" : "Temps avant pause"}
                    </h3>
                    <div className={clsx(
                        "text-2xl font-mono font-bold",
                        timeState.severity === 'normal' ? "text-white" :
                            timeState.severity === 'warning' ? "text-orange-400" :
                                "text-red-400"
                    )}>
                        {displayTime} <span className="text-sm font-normal text-slate-500">{timeState.reason}</span>
                    </div>
                </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="hidden md:block w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={clsx(
                        "h-full rounded-full transition-all duration-500",
                        timeState.severity === 'normal' ? "bg-green-500" :
                            timeState.severity === 'warning' ? "bg-orange-500" :
                                "bg-red-500"
                    )}
                    // Width is percentage of time USED relative to 4h30 (270m)
                    // If remaining is 270, width 0%. If remaining 0, width 100%.
                    style={{ width: `${Math.max(0, Math.min(100, ((270 - timeState.remainingMinutes) / 270) * 100))}%` }}
                />
            </div>
        </div>
    );
};
