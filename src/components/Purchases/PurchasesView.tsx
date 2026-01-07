import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { StorageService } from '../../services/storage';
import type { DailyLog, Purchase } from '../../types';
import { Plus, Trash2, ShoppingBag, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '../../contexts/LanguageContext';

export const PurchasesView = () => {
    const { t, dateLocale } = useLanguage();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [logs, setLogs] = useState<DailyLog[]>(StorageService.getAllLogs());
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [newPurchase, setNewPurchase] = useState<{
        date: string;
        description: string;
        amount: string;
    }>({
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        amount: ''
    });

    const handleMonthChange = (offset: number) => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentMonth(newDate);
    };

    const handleAddPurchase = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPurchase.description || !newPurchase.amount) return;

        const amount = parseFloat(newPurchase.amount);
        if (isNaN(amount)) return;

        const purchase: Purchase = {
            id: Date.now().toString(),
            date: newPurchase.date,
            description: newPurchase.description,
            amount
        };

        const targetDate = newPurchase.date;
        const existingLogIndex = logs.findIndex(l => l.date === targetDate);

        let updatedLogs = [...logs];

        if (existingLogIndex >= 0) {
            // Update existing log
            const log = updatedLogs[existingLogIndex];
            const updatedLog = {
                ...log,
                purchases: [...(log.purchases || []), purchase]
            };
            updatedLogs[existingLogIndex] = updatedLog;
            StorageService.saveDayLog(updatedLog);
        } else {
            // Create new log (partial) if day doesn't exist yet? 
            // Better to only allow adding if log exists or just create a minimal shell.
            // For simplicity, let's assume we create a minimal shell if it doesn't exist.
            const newLog: DailyLog = {
                id: targetDate,
                date: targetDate,
                context: { client: '', route: '', cargo: '' },
                segments: [],
                events: [],
                stats: { totalDriveMinutes: 0, totalWorkMinutes: 0, totalAvailableMinutes: 0, totalRestMinutes: 0, amplitudeMinutes: 0 },
                expenses: { meals: 0, decouches: 'none', totalAmount: 0 },
                purchases: [purchase]
            };
            updatedLogs.push(newLog);
            StorageService.saveDayLog(newLog);
        }

        setLogs(updatedLogs);
        setNewPurchase({ date: format(new Date(), 'yyyy-MM-dd'), description: '', amount: '' });
        setIsFormOpen(false);
    };

    const handleDeletePurchase = (logId: string, purchaseId: string) => {
        const logIndex = logs.findIndex(l => l.id === logId);
        if (logIndex === -1) return;

        const log = logs[logIndex];
        const updatedLog = {
            ...log,
            purchases: (log.purchases || []).filter(p => p.id !== purchaseId)
        };

        const updatedLogs = [...logs];
        updatedLogs[logIndex] = updatedLog;

        setLogs(updatedLogs);
        StorageService.saveDayLog(updatedLog);
    };

    // Calculate Monthly Stats
    const monthlyStats = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const daysInMonth = eachDayOfInterval({ start, end });

        let totalEarnings = 0;
        let totalSpending = 0;

        const dailyData = daysInMonth.map((day: Date) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const log = logs.find(l => l.date === dateStr);

            const earnings = log?.expenses?.totalAmount || 0;
            const purchases = log?.purchases || [];
            const spending = purchases.reduce((acc, p) => acc + p.amount, 0);

            if (isSameMonth(day, currentMonth)) {
                totalEarnings += earnings;
                totalSpending += spending;
            }

            return {
                date: day,
                earnings,
                spending,
                purchases,
                logId: log?.id
            };
        }).filter((d: any) => isSameMonth(d.date, currentMonth)); // Ensure strictly current month grid

        // Sort descending
        dailyData.sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

        return { totalEarnings, totalSpending, dailyData };
    }, [logs, currentMonth]);

    const balance = monthlyStats.totalEarnings - monthlyStats.totalSpending;

    return (
        <div className="p-4 space-y-6 pb-24">
            {/* Header / Month Selector */}
            <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
                <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400">
                    <Calendar size={20} />
                </button>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                    {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
                </h2>
                <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400">
                    <Calendar size={20} />
                </button>
            </div>

            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center">
                    <span className="text-[10px] uppercase text-green-400 font-bold mb-1">{t('purchases.earnings')}</span>
                    <span className="text-lg font-bold text-green-300">+{monthlyStats.totalEarnings.toFixed(2)}€</span>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col items-center">
                    <span className="text-[10px] uppercase text-red-400 font-bold mb-1">{t('purchases.spending')}</span>
                    <span className="text-lg font-bold text-red-300">-{monthlyStats.totalSpending.toFixed(2)}€</span>
                </div>
                <div className={clsx(
                    "p-3 rounded-lg border flex flex-col items-center",
                    balance >= 0 ? "bg-indigo-900/30 border-indigo-500/50" : "bg-orange-900/30 border-orange-500/50"
                )}>
                    <span className="text-[10px] uppercase text-slate-400 font-bold mb-1">{t('purchases.balance')}</span>
                    <span className={clsx("text-lg font-bold", balance >= 0 ? "text-indigo-300" : "text-orange-300")}>
                        {balance > 0 ? '+' : ''}{balance.toFixed(2)}€
                    </span>
                </div>
            </div>

            {/* Add Purchase Button */}
            {!isFormOpen && (
                <button
                    onClick={() => setIsFormOpen(true)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/50 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    {t('purchases.addExpense')}
                </button>
            )}

            {/* Add Purchase Form */}
            {isFormOpen && (
                <form onSubmit={handleAddPurchase} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-4 animate-in fade-in slide-in-from-top-4">
                    <h3 className="text-sm font-bold text-slate-300 uppercase">{t('purchases.newExpense')}</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">{t('purchases.date')}</label>
                            <input
                                type="date"
                                required
                                value={newPurchase.date}
                                onChange={e => setNewPurchase({ ...newPurchase, date: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">{t('purchases.description')}</label>
                            <input
                                type="text"
                                required
                                placeholder={t('purchases.placeholderDesc')}
                                value={newPurchase.description}
                                onChange={e => setNewPurchase({ ...newPurchase, description: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">{t('purchases.amount')}</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                placeholder="0.00"
                                value={newPurchase.amount}
                                onChange={e => setNewPurchase({ ...newPurchase, amount: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsFormOpen(false)}
                            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium"
                        >
                            {t('purchases.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                        >
                            {t('purchases.validate')}
                        </button>
                    </div>
                </form>
            )}

            {/* Daily List */}
            <div className="space-y-4">
                {monthlyStats.dailyData.map((dayData: any, idx: number) => {
                    const hasActivity = dayData.earnings > 0 || dayData.spending > 0;
                    if (!hasActivity) return null; // Hide empty days? Or show them? Let's hide empty to keep it clean.

                    return (
                        <div key={idx} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                            {/* Day Header */}
                            <div className="bg-slate-900/50 p-3 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-200 capitalize">
                                        {format(dayData.date, 'EEEE d MMM', { locale: dateLocale })}
                                    </span>
                                </div>
                                <div className="flex gap-3 text-xs font-mono">
                                    {dayData.earnings > 0 && (
                                        <span className="text-green-400 flex items-center gap-1">
                                            <TrendingUp size={12} /> +{dayData.earnings.toFixed(2)}€
                                        </span>
                                    )}
                                    {dayData.spending > 0 && (
                                        <span className="text-red-400 flex items-center gap-1">
                                            <TrendingDown size={12} /> -{dayData.spending.toFixed(2)}€
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Purchases List */}
                            {dayData.purchases.length > 0 ? (
                                <div className="divide-y divide-slate-700/50">
                                    {dayData.purchases.map((purchase: Purchase) => (
                                        <div key={purchase.id} className="p-3 flex justify-between items-center hover:bg-slate-700/30 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                                                    <ShoppingBag size={14} />
                                                </div>
                                                <span className="text-sm text-slate-300">{purchase.description}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-white">-{purchase.amount.toFixed(2)}€</span>
                                                <button
                                                    onClick={() => dayData.logId && handleDeletePurchase(dayData.logId, purchase.id)}
                                                    className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                dayData.earnings > 0 && <div className="p-3 text-center text-xs text-slate-500 italic">{t('purchases.noExpenseDay')}</div>
                            )}
                        </div>
                    );
                })}

                {monthlyStats.dailyData.every((d: any) => d.earnings === 0 && d.spending === 0) && (
                    <div className="text-center py-8 text-slate-500">
                        <ShoppingBag size={48} className="mx-auto mb-3 opacity-20" />
                        <p>{t('purchases.noActivity')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
