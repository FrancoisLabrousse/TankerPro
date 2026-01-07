import { useState } from 'react';
import type { DailyLog } from '../../types';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Truck, FileSpreadsheet } from 'lucide-react';
import { ActivityFeed } from '../Dashboard/ActivityFeed';
import { ExportService } from '../../services/export';
import { useLanguage } from '../../contexts/LanguageContext';
import { EXPENSE_RATES } from '../../utils/expenseConfiguration';

interface Props {
    log: DailyLog;
}

export const HistoryItem = ({ log }: Props) => {
    const { t, dateLocale, language } = useLanguage();
    const rates = EXPENSE_RATES[language] || EXPENSE_RATES['fr'];
    const [expanded, setExpanded] = useState(false);

    const context = log.context;

    // Use stored stats if available (which include live activity from Dashboard save), 
    // otherwise fallback to calculating from events (for older logs)
    const driveMinutes = log.stats?.totalDriveMinutes ?? log.events.reduce((acc, e) => acc + (e.type === 'Drive' ? (e.duration || 0) : 0), 0);
    const workMinutes = log.stats?.totalWorkMinutes ?? log.events.reduce((acc, e) => acc + (e.type === 'Work' ? (e.duration || 0) : 0), 0);
    const availableMinutes = log.stats?.totalAvailableMinutes ?? log.events.reduce((acc, e) => acc + (e.type === 'Available' ? (e.duration || 0) : 0), 0);
    const restMinutes = log.stats?.totalRestMinutes ?? log.events.reduce((acc, e) => acc + (e.type === 'Rest' ? (e.duration || 0) : 0), 0);
    const amplitudeMinutes = log.stats?.amplitudeMinutes ?? (() => {
        if (log.events.length === 0) return 0;
        const start = new Date(log.events[0].startTime);
        const last = log.events[log.events.length - 1];
        const end = last.endTime ? new Date(last.endTime) : new Date(last.startTime);
        return Math.floor((end.getTime() - start.getTime()) / 60000);
    })();

    return (
        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 shadow-sm transition-all hover:border-slate-600">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left p-4 focus:outline-none"
            >
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-indigo-400 font-bold">
                            {format(parseISO(log.date), 'dd MMM', { locale: dateLocale })}:
                        </span>
                        <span className="font-medium text-slate-100 truncate max-w-[150px]">
                            {context.route || t('history.noRoute')}
                        </span>
                    </div>
                    <span className="font-mono text-green-400 font-bold text-sm">
                        {log.expenses?.totalAmount?.toFixed(2) ?? '0.00'}€
                    </span>
                </div>

                <div className="flex justify-between items-end">
                    <div className="text-xs text-slate-400 flex flex-col gap-0.5">
                        <span className="flex items-center gap-1">
                            <Truck size={10} />
                            {log.segments && log.segments.length > 1
                                ? `${log.segments.length} ${t('history.missions')} (${log.segments.map(s => s.context.client).filter(Boolean).join(' ➔ ')})`
                                : (context.client || t('history.unknownClient'))
                            }
                        </span>
                        <span>
                            {Math.floor(driveMinutes / 60)}h{String(driveMinutes % 60).padStart(2, '0')} {t('history.driving')}
                        </span>
                    </div>
                    {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                </div>
            </button>

            {expanded && (
                <div className="bg-slate-900/50 p-4 border-t border-slate-700 space-y-4">
                    <div className="grid grid-cols-5 gap-1 text-center pb-2 border-b border-slate-700/50">
                        <div className="bg-green-500/10 rounded p-1">
                            <span className="text-[10px] text-green-400 block uppercase">{t('status.short.drive')}</span>
                            <span className="font-mono font-bold text-sm text-green-300">
                                {Math.floor(driveMinutes / 60)}h{String(driveMinutes % 60).padStart(2, '0')}
                            </span>
                        </div>
                        <div className="bg-blue-500/10 rounded p-1">
                            <span className="text-[10px] text-blue-400 block uppercase">{t('status.short.work')}</span>
                            <span className="font-mono font-bold text-sm text-blue-300">
                                {Math.floor(workMinutes / 60)}h{String(workMinutes % 60).padStart(2, '0')}
                            </span>
                        </div>
                        <div className="bg-yellow-500/10 rounded p-1">
                            <span className="text-[10px] text-yellow-400 block uppercase">{t('status.short.available')}</span>
                            <span className="font-mono font-bold text-sm text-yellow-300">
                                {Math.floor(availableMinutes / 60)}h{String(availableMinutes % 60).padStart(2, '0')}
                            </span>
                        </div>
                        <div className="bg-slate-500/10 rounded p-1">
                            <span className="text-[10px] text-slate-400 block uppercase">{t('status.short.rest')}</span>
                            <span className="font-mono font-bold text-sm text-slate-300">
                                {Math.floor(restMinutes / 60)}h{String(restMinutes % 60).padStart(2, '0')}
                            </span>
                        </div>
                        <div className="bg-red-500/10 rounded p-1">
                            <span className="text-[10px] text-red-400 block uppercase">{t('status.short.amplitude')}</span>
                            <span className="font-mono font-bold text-sm text-red-300">
                                {Math.floor(amplitudeMinutes / 60)}h{String(amplitudeMinutes % 60).padStart(2, '0')}
                            </span>
                        </div>
                    </div>

                    <div className="text-sm space-y-2">
                        {/* Segments List */}
                        {(log.segments && log.segments.length > 0) ? (
                            <div className="space-y-3 border-b border-slate-700/50 pb-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('history.missionsTitle')}</h4>
                                {log.segments.map((seg, idx) => (
                                    <div key={idx} className="bg-slate-800 p-2 rounded border border-slate-700/50 text-xs">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-mono text-indigo-400">
                                                {format(parseISO(seg.startTime), 'HH:mm')}
                                            </span>
                                            <span className="text-slate-500 italic">
                                                {seg.context.route}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 font-medium text-slate-300">
                                            <Truck size={12} /> {seg.context.client || t('history.noClient')}
                                        </div>
                                        {seg.context.cargo && (
                                            <div className="text-slate-500 mt-0.5">
                                                📦 {seg.context.cargo}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Fallback for old logs without segments
                            <>
                                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                    <span className="text-slate-500">{t('dashboard.client')}</span>
                                    <span className="text-slate-200 font-medium">{context.client || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                    <span className="text-slate-500">{t('dashboard.route')}</span>
                                    <span className="text-slate-200 font-medium">{context.route || '-'}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                    <span className="text-slate-500">{t('dashboard.cargo')}</span>
                                    <span className="text-slate-200 font-medium">{context.cargo || '-'}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Notes */}
                    {
                        context.notes && (
                            <div className="text-xs italic text-slate-400 bg-slate-800 p-2 rounded">
                                "{context.notes}"
                            </div>
                        )
                    }

                    {/* Full Activity Feed for this day */}
                    <div className="pt-2">
                        <ActivityFeed events={log.events} segments={log.segments} />
                    </div>

                    {/* Footer / Actions */}
                    <div className="pt-4 border-t border-slate-700/50 flex justify-end">
                        <button
                            onClick={(e) => { e.stopPropagation(); ExportService.exportDailyLogToExcel(log, t, dateLocale, rates); }}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-green-900/20"
                        >
                            <FileSpreadsheet size={16} />
                            {t('history.downloadExcel')}
                        </button>
                    </div >
                </div >
            )}
        </div >
    );
};
