import { useState, useEffect } from 'react';
import { Play, Anchor, Clock, Coffee, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { differenceInMinutes } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
    status: 'Drive' | 'Work' | 'Available' | 'Rest' | 'Idle';
    lastChange: string; // ISO
    stats: {
        totalDrive: number;
        totalService: number; // Work + Available + Drive
        amplitude: number;
        continuousDrive: number;
        continuousService: number;
    };
    onStatusChange: (status: 'Drive' | 'Work' | 'Available' | 'Rest') => void;
}

export const TachoControls = ({ status, lastChange, stats, onStatusChange }: Props) => {
    const { t } = useLanguage();
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (status !== 'Idle') {
                const diff = differenceInMinutes(new Date(), new Date(lastChange));
                setElapsed(diff);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [lastChange, status]);

    const formatTime = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h${m.toString().padStart(2, '0')}`;
    };

    const getButtonClass = (type: string, activeClass: string) => {
        const isActive = status === type;
        return clsx(
            "relative flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 shadow-lg border-2",
            isActive
                ? `${activeClass} scale-95 ring-2 ring-offset-2 ring-offset-slate-900 ${activeClass.replace('bg-', 'ring-')}`
                : "bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-400 hover:text-slate-200 opacity-80"
        );
    };

    // Alert Logic: 
    // 1. Driving > 4h15 (255m) continuous
    // 2. Service > 6h (360m) continuous => Warning at 5h45 (345m)
    const showDriveAlert = stats.continuousDrive > 255;
    const showServiceAlert = stats.continuousService > 345;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 h-64">
                {/* DRIVE */}
                <button
                    onClick={() => onStatusChange('Drive')}
                    className={getButtonClass('Drive', 'bg-green-600 border-green-500 text-white')}
                >
                    <Play size={40} className="mb-2" />
                    <span className="text-xl font-bold tracking-wider">{t('status.drive').toUpperCase()}</span>
                    {status === 'Drive' && <span className="absolute bottom-2 text-sm font-mono opacity-90">{formatTime(elapsed)}</span>}
                </button>

                {/* WORK */}
                <button
                    onClick={() => onStatusChange('Work')}
                    className={getButtonClass('Work', 'bg-blue-600 border-blue-500 text-white')}
                >
                    <Anchor size={40} className="mb-2" />
                    <span className="text-xl font-bold tracking-wider">{t('status.work').toUpperCase()}</span>
                    {status === 'Work' && <span className="absolute bottom-2 text-sm font-mono opacity-90">{formatTime(elapsed)}</span>}
                </button>

                {/* AVAILABLE */}
                <button
                    onClick={() => onStatusChange('Available')}
                    className={getButtonClass('Available', 'bg-yellow-600 border-yellow-500 text-white')}
                >
                    <Clock size={40} className="mb-2" />
                    <span className="text-xl font-bold tracking-wider">{t('status.available').toUpperCase()}</span>
                    {status === 'Available' && <span className="absolute bottom-2 text-sm font-mono opacity-90">{formatTime(elapsed)}</span>}
                </button>

                {/* REST */}
                <button
                    onClick={() => onStatusChange('Rest')}
                    className={getButtonClass('Rest', 'bg-red-600 border-red-500 text-white')}
                >
                    <Coffee size={40} className="mb-2" />
                    <span className="text-xl font-bold tracking-wider">{t('status.rest').toUpperCase()}</span>
                    {status === 'Rest' && <span className="absolute bottom-2 text-sm font-mono opacity-90">{formatTime(elapsed)}</span>}
                </button>
            </div>

            {/* Stats & Alerts Card */}
            <div className="bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-700">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t('dashboard.dailySummary')}</h3>

                {/* Top Row: Total Drive & Service */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Drive */}
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 mb-1">{t('dashboard.totalDrive')}</span>
                        <div className="flex items-end gap-2">
                            <span className={clsx("text-2xl font-mono font-bold", stats.totalDrive > 540 ? "text-red-400" : "text-slate-100")}>
                                {formatTime(stats.totalDrive)}
                            </span>
                            <span className="text-xs text-slate-500 mb-1">/ 9h00</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                                className={clsx("h-full rounded-full", stats.totalDrive > 540 ? "bg-red-500" : "bg-green-500")}
                                style={{ width: `${Math.min((stats.totalDrive / 540) * 100, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Service */}
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 mb-1">{t('dashboard.service')}</span>
                        <div className="flex items-end gap-2">
                            <span className={clsx("text-2xl font-mono font-bold", stats.continuousService > 360 ? "text-orange-400" : "text-slate-100")}>
                                {formatTime(stats.totalService)}
                            </span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden">
                            {/* Bar shows CONTINUOUS service progress towards 6h, as that's the critical limit? 
                                 Or total daily service? User asked for total Service indicator. 
                                 Let's show Total Service but maybe bar reflects continuous status? 
                                 Or just a generic bar. Let's make it a simple progress based on... well there's no daily limit for service per se (13h amplitude includes breaks).
                                 Let's just show the value.
                             */}
                            <div
                                className="bg-yellow-500 h-full rounded-full"
                                style={{ width: `${Math.min((stats.totalService / 780) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Amplitude */}
                <div className="border-t border-slate-700 pt-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 mb-1">{t('dashboard.amplitude')}</span>
                        <div className="flex items-end gap-2">
                            <span className={clsx("text-2xl font-mono font-bold", stats.amplitude > 780 ? "text-red-400" : "text-slate-100")}>
                                {formatTime(stats.amplitude)}
                            </span>
                            <span className="text-xs text-slate-500 mb-1">/ 13h00</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                                className="bg-blue-500 h-full rounded-full"
                                style={{ width: `${Math.min((stats.amplitude / 780) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                {(showDriveAlert || showServiceAlert) && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 animate-pulse">
                        <AlertTriangle className="text-red-500" size={20} />
                        <span className="text-red-200 text-sm font-medium">
                            {showDriveAlert ? t('dashboard.alertPause') : "Pause OBLIGATOIRE (6h Service)"}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
