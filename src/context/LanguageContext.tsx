import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, TRANSLATIONS, getLocalizedCategory, getLocalizedUnit } from '../locales/translations';

export const LANGUAGE_STORAGE_KEY = 'pesos_language';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  getCategory: (categoryName: string) => string;
  getUnit: (unitName: string, count?: number) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  toggleLanguage: () => {},
  t: (key, fallback) => fallback || key,
  getCategory: (cat) => cat,
  getUnit: (u) => u,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'ceb') {
        return stored;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'en';
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLocale);
    } catch {
      // Ignore localStorage errors
    }
  };

  const toggleLanguage = () => {
    setLocale(locale === 'en' ? 'ceb' : 'en');
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[locale] || TRANSLATIONS.en;
    if (dict[key]) {
      return dict[key];
    }
    const enDict = TRANSLATIONS.en;
    if (enDict[key]) {
      return enDict[key];
    }
    return fallback || key;
  };

  const getCategory = (categoryName: string) => getLocalizedCategory(categoryName, locale);
  const getUnit = (unitName: string, count = 1) => getLocalizedUnit(unitName, count, locale);

  // Cross-tab storage synchronization
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LANGUAGE_STORAGE_KEY) {
        if (e.newValue === 'en' || e.newValue === 'ceb') {
          setLocaleState(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLanguage, t, getCategory, getUnit }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export { getLocalizedCategory, getLocalizedUnit } from '../locales/translations';
