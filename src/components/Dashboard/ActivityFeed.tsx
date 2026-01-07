import type { TachographEvent, ShiftSegment } from '../../types';
import { Play, Anchor, Clock, Coffee, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
    events: TachographEvent[];
    segments?: ShiftSegment[];
    onUpdateEvent?: (index: number, note: string) => void;
}

export const ActivityFeed = ({ events, segments, onUpdateEvent }: Props) => {
    const { t, dateLocale } = useLanguage();
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editNote, setEditNote] = useState('');

    const handleEditClick = (index: number, currentNote?: string) => {
        if (!onUpdateEvent) return;
        setEditingIndex(index);
        setEditNote(currentNote || '');
    };

    const handleSave = (index: number) => {
        if (!onUpdateEvent) return;
        onUpdateEvent(index, editNote);
        setEditingIndex(null);
    };
    if (!events || events.length === 0) {
        return (
            <div className="text-center p-4 text-slate-500 text-sm italic">
                {t('activity.noActivityToday')}
            </div>
        );
    }

    // Reverse events to show newest first
    const reversedEvents = [...events].reverse();

    const getIcon = (type: string) => {
        switch (type) {
            case 'Drive': return <Play size={16} />;
            case 'Work': return <Anchor size={16} />;
            case 'Available': return <Clock size={16} />;
            case 'Rest': return <Coffee size={16} />;
            default: return <Clock size={16} />;
        }
    };

    const getLabel = (type: string) => {
        switch (type) {
            case 'Drive': return t('status.drive');
            case 'Work': return t('status.work');
            case 'Available': return t('status.available');
            case 'Rest': return t('status.rest');
            default: return type;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'Drive': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'Work': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'Available': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'Rest': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    }

    // Map events to segments...
    const eventSegmentMap = new Map<number, ShiftSegment>();

    if (segments) {
        const sortedSegments = [...segments].sort((a, b) => a.startTime.localeCompare(b.startTime));
        events.forEach((event, index) => {
            const segmentForThisEvent = sortedSegments.find((seg, segIdx) => {
                const nextSeg = sortedSegments[segIdx + 1];
                const eventTime = new Date(event.startTime).getTime();
                const segTime = new Date(seg.startTime).getTime();
                const nextSegTime = nextSeg ? new Date(nextSeg.startTime).getTime() : Infinity;
                return eventTime >= segTime && eventTime < nextSegTime;
            });

            if (segmentForThisEvent) {
                const prevEvent = index > 0 ? events[index - 1] : null;
                if (!prevEvent || new Date(prevEvent.startTime).getTime() < new Date(segmentForThisEvent.startTime).getTime()) {
                    eventSegmentMap.set(index, segmentForThisEvent);
                }
            }
        });
    }

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('activity.feedTitle')}</h3>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-700/50">
                {reversedEvents.map((event, index) => {
                    const originalIndex = events.length - 1 - index;
                    const isEditing = editingIndex === index;
                    const segment = eventSegmentMap.get(originalIndex);

                    return (
                        <div key={event.startTime}>
                            {segment && (
                                (segment.context.client || segment.context.route || segment.context.cargo) && (
                                    <div className="bg-slate-700/50 px-3 py-1.5 border-y border-slate-700 flex items-center gap-2">
                                        <MapPin size={12} className="text-indigo-400" />
                                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">
                                            {t('activity.newMission')} : {segment.context.client} - {segment.context.route}
                                        </span>
                                    </div>
                                )
                            )}

                            <div className="hover:bg-slate-700/30 transition-colors group" title={event.note}>
                                <div className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("p-2 rounded-lg border", getColor(event.type))}>
                                            {getIcon(event.type)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-200">{getLabel(event.type)}</span>
                                            <span className="text-xs text-slate-500 flex flex-col">
                                                <span>{new Date(event.startTime).toLocaleDateString(dateLocale ? undefined : [], { ... (dateLocale ? { locale: dateLocale } : {}), day: '2-digit', month: '2-digit' })}</span>
                                                <span>
                                                    {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {' - '}
                                                    {event.endTime ? new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-sm font-mono font-bold text-slate-300">{event.duration} min</span>
                                        {onUpdateEvent && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEditClick(index, event.note); }}
                                                className="text-[10px] text-indigo-400 hover:text-indigo-300 underline opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                {event.note ? t('activity.edit') : t('activity.addNote')}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isEditing ? (
                                    <div className="px-3 pb-3">
                                        <input
                                            type="text"
                                            value={editNote}
                                            onChange={(e) => setEditNote(e.target.value)}
                                            onBlur={() => handleSave(originalIndex)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSave(originalIndex)}
                                            autoFocus
                                            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                            placeholder={t('activity.notePlaceholder')}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                ) : event.note && (
                                    <div className="px-3 pb-2">
                                        <div className="text-xs text-slate-400 italic bg-slate-900/50 p-1.5 rounded border border-slate-700/50">
                                            📝 {event.note}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div >
    );
};
