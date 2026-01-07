import { useState } from 'react';
import { Smartphone, FileSpreadsheet, HardDrive, Info, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import clsx from 'clsx';
import { useLanguage } from '../../contexts/LanguageContext';
import { supportedLanguages } from '../../i18n/translations';

export const SettingsView = () => {
    const { language, setLanguage, t } = useLanguage();

    return (
        <div className="p-4 space-y-6 pb-24">
            <h2 className="text-xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                {t('settings.title')}
            </h2>

            {/* Language Selector */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1">
                    <Globe size={20} />
                    <h3>{t('settings.language')}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {supportedLanguages.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}
                            className={clsx(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-all text-center border",
                                language === lang.code
                                    ? "bg-indigo-600 text-white border-indigo-500 scale-105 shadow-lg shadow-indigo-900/50"
                                    : "bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-700"
                            )}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Section: Mode d'Emploi */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex items-center gap-2">
                    <Info className="text-indigo-400" size={20} />
                    <h3 className="font-bold text-slate-200">{t('settings.manual')}</h3>
                </div>

                <div className="divide-y divide-slate-700/50">
                    {/* Installation */}
                    <ExpandableSection
                        title={t('settings.install')}
                        icon={<Smartphone size={18} className="text-blue-400" />}
                    >
                        <p className="mb-2">{t('settings.installText')}</p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-400">
                            <li><strong>{t('settings.installIos')}</strong></li>
                            <li><strong>{t('settings.installAndroid')}</strong></li>
                        </ul>
                    </ExpandableSection>

                    {/* Sauvegarde / Export */}
                    <ExpandableSection
                        title={t('settings.backup')}
                        icon={<FileSpreadsheet size={18} className="text-green-400" />}
                    >
                        <div className="space-y-3">
                            <p>{t('settings.backupText')}</p>

                            <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded-lg">
                                <p className="text-yellow-200 font-bold text-xs mb-1">{t('settings.backupWarningTitle')}</p>
                                <p className="text-xs text-yellow-100/80">
                                    {t('settings.backupWarningText')}
                                </p>
                            </div>
                        </div>
                    </ExpandableSection>

                    {/* Nettoyage */}
                    <ExpandableSection
                        title={t('settings.cleanup')}
                        icon={<HardDrive size={18} className="text-red-400" />}
                    >
                        <p className="mb-2">{t('settings.cleanupText1')}</p>
                        <p className="mb-2">{t('settings.cleanupText2')}</p>
                        <p className="text-xs text-slate-500 italic">
                            {t('settings.cleanupWarning')}
                        </p>
                    </ExpandableSection>
                </div>
            </div>

            {/* Version Info */}
            <div className="text-center">
                <p className="text-xs text-slate-600">TankerPro v1.0.0</p>
                <p className="text-[10px] text-slate-700 mt-1">{t('settings.devBy')}</p>
            </div>
        </div>
    );
};

const ExpandableSection = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="transition-colors hover:bg-slate-700/20">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="font-medium text-slate-300">{title}</span>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>
            <div className={clsx(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="p-4 pt-0 text-sm text-slate-400 leading-relaxed">
                    {children}
                </div>
            </div>
        </div>
    );
};
