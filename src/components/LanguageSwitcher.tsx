import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { triggerHapticFeedback } from '../utils/localDb';

export const LanguageSwitcher: React.FC = () => {
  const { locale, setLocale } = useLanguage();

  return (
    <div 
      className="inline-flex items-center rounded-lg bg-surface-muted p-0.5 border border-theme shadow-xs shrink-0 select-none"
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        onClick={() => {
          if (locale !== 'en') {
            triggerHapticFeedback('tap');
            setLocale('en');
          }
        }}
        className={`px-2 py-1 rounded-md text-[11px] font-mono font-extrabold uppercase transition-all duration-150 cursor-pointer ${
          locale === 'en'
            ? 'bg-[#006AFF] text-white shadow-xs'
            : 'text-muted hover:text-primary'
        }`}
        title="English"
      >
        EN
      </button>

      <button
        type="button"
        onClick={() => {
          if (locale !== 'ceb') {
            triggerHapticFeedback('tap');
            setLocale('ceb');
          }
        }}
        className={`px-2 py-1 rounded-md text-[11px] font-mono font-extrabold uppercase transition-all duration-150 cursor-pointer ${
          locale === 'ceb'
            ? 'bg-[#006AFF] text-white shadow-xs'
            : 'text-muted hover:text-primary'
        }`}
        title="Cebuano (Bisaya)"
      >
        CEB
      </button>
    </div>
  );
};
