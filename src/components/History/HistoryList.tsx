import { useState, useMemo } from 'react';
import { StorageService } from '../../services/storage';
import type { DailyLog } from '../../types';
import { HistoryItem } from './HistoryItem';
import { format, parseISO } from 'date-fns';
import { Download, Trash2, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../../contexts/LanguageContext';

export const HistoryList = () => {
    const { t, dateLocale } = useLanguage();
    // Force re-render after delete
    const [tick, setTick] = useState(0);
    const logs = useMemo(() => StorageService.getAllLogs(), [tick]);

    // Group logs by Month (YYYY-MM)
    const groupedLogs = useMemo(() => {
        return logs.reduce((acc, log) => {
            const date = parseISO(log.date);
            const monthKey = format(date, 'yyyy-MM');
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(log);
            return acc;
        }, {} as Record<string, DailyLog[]>);
    }, [logs]);

    // Sort months descending
    const sortedMonths = Object.keys(groupedLogs).sort().reverse();

    const handleExport = (monthKey: string) => {
        const monthLogs = groupedLogs[monthKey];
        if (!monthLogs || monthLogs.length === 0) return;

        const wb = XLSX.utils.book_new();

        // 1. Daily Activity Sheet
        const dailyData = monthLogs.map(log => ({
            Date: log.date,
            Service: ((log.stats.totalDriveMinutes + log.stats.totalWorkMinutes + log.stats.totalAvailableMinutes) / 60).toFixed(2),
            [t('status.drive')]: (log.stats.totalDriveMinutes / 60).toFixed(2),
            [t('status.work')]: (log.stats.totalWorkMinutes / 60).toFixed(2),
            [t('status.available')]: (log.stats.totalAvailableMinutes / 60).toFixed(2),
            [t('status.rest')]: (log.stats.totalRestMinutes / 60).toFixed(2),
            [t('dashboard.amplitude')]: (log.stats.amplitudeMinutes / 60).toFixed(2),
            [t('dashboard.expenses') + ' (' + t('dashboard.meals') + ')']: log.expenses.meals,
            [t('dashboard.expenses') + ' (' + t('dashboard.overnight') + ')']: log.expenses.decouches === 'none' ? 0 : 1,
            [t('dashboard.expenses')]: log.expenses.totalAmount,
            "Total Achats": (log.purchases || []).reduce((acc, p) => acc + p.amount, 0),
            "Solde Jour": log.expenses.totalAmount - (log.purchases || []).reduce((acc, p) => acc + p.amount, 0)
        }));
        const wsDaily = XLSX.utils.json_to_sheet(dailyData);
        XLSX.utils.book_append_sheet(wb, wsDaily, t('excel.dailyActivity'));

        // 2. Events Detail Sheet
        const eventsData: any[] = [];
        monthLogs.forEach(log => {
            log.events.forEach(event => {
                eventsData.push({
                    Date: log.date,
                    "Heure Début": format(new Date(event.startTime), 'HH:mm'),
                    "Heure Fin": event.endTime ? format(new Date(event.endTime), 'HH:mm') : 'En cours',
                    Type: event.type,
                    "Durée (min)": event.duration,
                    Note: event.note || ''
                });
            });
        });
        const wsEvents = XLSX.utils.json_to_sheet(eventsData);
        XLSX.utils.book_append_sheet(wb, wsEvents, t('excel.eventsDetail'));

        // 3. Purchases Sheet
        const purchasesData: any[] = [];
        monthLogs.forEach(log => {
            (log.purchases || []).forEach(purchase => {
                purchasesData.push({
                    Date: purchase.date,
                    Description: purchase.description,
                    Montant: purchase.amount
                });
            });
        });
        const wsPurchases = XLSX.utils.json_to_sheet(purchasesData);
        XLSX.utils.book_append_sheet(wb, wsPurchases, t('excel.purchasesList'));

        // Generate Filename
        const firstDate = parseISO(monthLogs[0].date);
        const fileName = `${t('excel.filename')}_${format(firstDate, 'MMMM_yyyy', { locale: dateLocale })}.xlsx`;

        XLSX.writeFile(wb, fileName);
    };

    const handleDeleteMonth = (monthKey: string) => {
        const monthLogs = groupedLogs[monthKey];
        if (!monthLogs) return;

        const firstDate = parseISO(monthLogs[0].date);
        const monthName = format(firstDate, 'MMMM yyyy', { locale: dateLocale });

        if (window.confirm(t('history.deleteConfirm', { month: monthName }))) {
            const logDates = monthLogs.map(l => l.date);
            StorageService.deleteLogs(logDates);
            setTick(prev => prev + 1); // Refresh list
        }
    };

    if (logs.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500">
                <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                <p>{t('history.noHistory')}</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 pb-24">
            <h2 className="text-xl font-bold text-white mb-6">{t('history.title')}</h2>

            {sortedMonths.map(monthKey => {
                const monthDate = parseISO(`${monthKey}-01`);
                return (
                    <div key={monthKey} className="space-y-3">
                        {/* Month Header with Actions */}
                        <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur-sm p-3 rounded-xl border border-slate-700/50 sticky top-0 z-10 shadow-lg">
                            <h3 className="text-lg font-bold text-indigo-300 capitalize flex items-center gap-2">
                                <Calendar size={18} />
                                {format(monthDate, 'MMMM yyyy', { locale: dateLocale })}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleExport(monthKey)}
                                    className="p-2 bg-green-900/40 text-green-400 hover:bg-green-900/60 rounded-lg transition-colors"
                                    title="Exporter vers Excel"
                                >
                                    <Download size={18} />
                                </button>
                                <button
                                    onClick={() => handleDeleteMonth(monthKey)}
                                    className="p-2 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded-lg transition-colors"
                                    title="Supprimer ce mois"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* List of Days */}
                        <div className="space-y-4 pl-2 border-l-2 border-slate-800">
                            {groupedLogs[monthKey].map(log => (
                                <HistoryItem key={log.id} log={log} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
