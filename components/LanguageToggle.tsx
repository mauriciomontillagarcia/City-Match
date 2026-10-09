
import React from 'react';
import { Language, useI18n } from '../i18n';

const LANGUAGES: Language[] = ['es', 'en'];

const LanguageToggle: React.FC = () => {
  const { lang, setLang, t } = useI18n();

  return (
    <div role="group" aria-label={t.switchLanguage} className="flex bg-slate-100/80 rounded-xl p-1 shrink-0">
      {LANGUAGES.map(code => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          lang={code}
          className={`h-9 w-9 rounded-lg text-xs font-bold transition-colors ${
            lang === code ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
