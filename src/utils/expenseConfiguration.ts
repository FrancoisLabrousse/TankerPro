import type { Language } from '../i18n/translations';

export interface ExpenseRates {
    meal: number;
    domesticNight: number;
    europeNight: number;
    domesticLabel: string;
}

export const EXPENSE_RATES: Record<Language, ExpenseRates> = {
    fr: { meal: 16.50, domesticNight: 50, europeNight: 65, domesticLabel: 'France' },
    en: { meal: 25.00, domesticNight: 45, europeNight: 60, domesticLabel: 'UK' },
    de: { meal: 28.00, domesticNight: 40, europeNight: 50, domesticLabel: 'Deutschland' },
    es: { meal: 15.00, domesticNight: 40, europeNight: 55, domesticLabel: 'España' },
    it: { meal: 30.00, domesticNight: 46, europeNight: 77, domesticLabel: 'Italia' },
    pl: { meal: 15.00, domesticNight: 40, europeNight: 50, domesticLabel: 'Polska' },
    sv: { meal: 22.00, domesticNight: 45, europeNight: 60, domesticLabel: 'Sverige' },
    lt: { meal: 15.00, domesticNight: 40, europeNight: 50, domesticLabel: 'Lietuva' },
    ro: { meal: 15.00, domesticNight: 35, europeNight: 50, domesticLabel: 'România' },
    da: { meal: 45.00, domesticNight: 60, europeNight: 75, domesticLabel: 'Danmark' },
    nl: { meal: 25.00, domesticNight: 45, europeNight: 60, domesticLabel: 'Nederland' },
};
