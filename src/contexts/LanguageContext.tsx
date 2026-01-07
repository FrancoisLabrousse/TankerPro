import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translations, type Language, supportedLanguages } from '../i18n/translations';
import { fr, enGB, de, it, es, sv, pl, lt, ro, da, nl } from 'date-fns/locale';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string>) => string;
    dateLocale: any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const localeMap: Record<Language, any> = {
    fr,
    en: enGB,
    de,
    it,
    es,
    sv,
    pl,
    lt,
    ro,
    da,
    nl
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('fr');

    useEffect(() => {
        const storedLang = localStorage.getItem('app-language') as Language;
        if (storedLang && supportedLanguages.find(l => l.code === storedLang)) {
            setLanguageState(storedLang);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app-language', lang);
    };

    const t = (key: string, params?: Record<string, string>) => {
        const text = translations[language][key] || translations['fr'][key] || key;
        if (params) {
            return Object.entries(params).reduce((acc, [k, v]) => {
                return acc.replace(`{${k}}`, v);
            }, text);
        }
        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dateLocale: localeMap[language] }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
