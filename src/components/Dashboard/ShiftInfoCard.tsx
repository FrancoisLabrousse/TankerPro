import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Truck, MapPin, Package, FileText } from 'lucide-react';
import type { ShiftContext } from '../../types';
import clsx from 'clsx';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
    data: ShiftContext;
    onUpdate: (data: ShiftContext) => void;
    onNewSegment: () => void;
}

export const ShiftInfoCard = ({ data, onUpdate, onNewSegment }: Props) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(true);
    const [formData, setFormData] = useState(data);

    useEffect(() => {
        setFormData(data);
    }, [data]);

    const handleChange = (field: keyof ShiftContext, value: string) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);
        onUpdate(newData);
    };

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden mb-4 transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            >
                <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                    <FileText size={20} />
                    <span>{t('dashboard.missionInfo')}</span>
                </div>
                {isOpen ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
            </button>

            <div className={clsx(
                "transition-all duration-300 ease-in-out overflow-hidden",
                isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="p-4 pt-0 space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={(e) => { e.stopPropagation(); onNewSegment(); }}
                            className="text-xs bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/50 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                        >
                            <FileText size={12} />
                            {t('dashboard.newMission')}
                        </button>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium ml-1 flex items-center gap-1">
                            <Truck size={12} /> {t('dashboard.client')}
                        </label>
                        <input
                            type="text"
                            value={formData.client}
                            onChange={(e) => handleChange('client', e.target.value)}
                            placeholder="Ex: Rammstein Corp"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium ml-1 flex items-center gap-1">
                            <MapPin size={12} /> {t('dashboard.route')}
                        </label>
                        <input
                            type="text"
                            value={formData.route}
                            onChange={(e) => handleChange('route', e.target.value)}
                            placeholder="Ex: Berlin -> Paris"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium ml-1 flex items-center gap-1">
                            <Package size={12} /> {t('dashboard.cargo')}
                        </label>
                        <input
                            type="text"
                            value={formData.cargo}
                            onChange={(e) => handleChange('cargo', e.target.value)}
                            placeholder="Ex: Produits Chimiques"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
