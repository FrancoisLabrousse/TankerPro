import { useState, useEffect } from 'react';
import { Euro, MapPin, Coffee } from 'lucide-react';
import type { Expenses } from '../../types';
import clsx from 'clsx';
import { useLanguage } from '../../contexts/LanguageContext';
import { EXPENSE_RATES } from '../../utils/expenseConfiguration';

interface Props {
    expenses: Expenses;
    onUpdate: (expenses: Expenses) => void;
}

export const ExpensesCard = ({ expenses, onUpdate }: Props) => {
    const { t, language } = useLanguage();
    const rates = EXPENSE_RATES[language] || EXPENSE_RATES['fr'];

    const [localExpenses, setLocalExpenses] = useState(expenses);

    useEffect(() => {
        setLocalExpenses(expenses);
    }, [expenses]);

    const update = (newExpenses: Expenses) => {
        setLocalExpenses(newExpenses);
        onUpdate(newExpenses);
    };

    const handleMealsChange = (delta: number) => {
        const newCount = Math.max(0, localExpenses.meals + delta);
        const currentDecoucheRate = localExpenses.decouches === 'france'
            ? rates.domesticNight
            : localExpenses.decouches === 'europe'
                ? rates.europeNight
                : 0;

        update({
            ...localExpenses,
            meals: newCount,
            totalAmount: (newCount * rates.meal) + currentDecoucheRate
        });
    };

    const handleDecoucheChange = (type: 'none' | 'france' | 'europe') => {
        const decoucheRate = type === 'france'
            ? rates.domesticNight
            : type === 'europe'
                ? rates.europeNight
                : 0;

        update({
            ...localExpenses,
            decouches: type,
            totalAmount: (localExpenses.meals * rates.meal) + decoucheRate
        });
    };

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Euro size={16} className="text-green-500" />
                {t('dashboard.expenses')}
            </h3>

            <div className="space-y-4">
                {/* Meals */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Coffee size={18} className="text-orange-400" />
                        <span className="text-sm text-slate-300">
                            {t('dashboard.meals')} ({rates.meal.toFixed(2)}€)
                        </span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900 rounded-lg p-1">
                        <button
                            onClick={() => handleMealsChange(-1)}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        >
                            -
                        </button>
                        <span className="font-mono font-bold w-4 text-center">{localExpenses.meals}</span>
                        <button
                            onClick={() => handleMealsChange(1)}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Overnights */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-purple-400" />
                        <span className="text-sm text-slate-300">{t('dashboard.overnight')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => handleDecoucheChange('none')}
                            className={clsx(
                                "px-2 py-2 text-xs font-medium rounded-lg border transition-all",
                                localExpenses.decouches === 'none'
                                    ? "bg-slate-700 border-slate-500 text-white"
                                    : "bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800"
                            )}
                        >
                            {t('expenses.none')}
                        </button>
                        <button
                            onClick={() => handleDecoucheChange('france')} // Key remains 'france' for legacy reasons but display differs
                            className={clsx(
                                "px-2 py-2 text-xs font-medium rounded-lg border transition-all",
                                localExpenses.decouches === 'france'
                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                                    : "bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800"
                            )}
                        >
                            {rates.domesticLabel} ({rates.domesticNight}€)
                        </button>
                        <button
                            onClick={() => handleDecoucheChange('europe')}
                            className={clsx(
                                "px-2 py-2 text-xs font-medium rounded-lg border transition-all",
                                localExpenses.decouches === 'europe'
                                    ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20"
                                    : "bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800"
                            )}
                        >
                            {t('expenses.europe')} ({rates.europeNight}€)
                        </button>
                    </div>
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                    <span className="text-sm text-slate-400">{t('dashboard.estimatedTotal')}</span>
                    <span className="text-xl font-mono font-bold text-green-400">
                        {localExpenses.totalAmount.toFixed(2)} €
                    </span>
                </div>
            </div>
        </div>
    );
};
