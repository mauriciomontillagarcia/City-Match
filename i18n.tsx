
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'es';

const STORAGE_KEY = 'city-match-language';

const translations = {
  en: {
    pageTitle: 'City Match | Compare City Sizes',
    tagline: 'Global Footprints',
    searchPlaceholder: 'Search a city…',
    searchLabel: 'Search for a city (e.g., Paris, Tokyo, Madrid)',
    welcomeTitle: 'Compare cities worldwide',
    welcomeText: 'Search for cities above to visualize their geographic footprints. Drag them across the map to see how they truly compare in size.',
    close: 'Close',
    activeLayers: 'Active Layers',
    sizeComparison: 'Size Comparison',
    is: 'is',
    than: 'than',
    timesLarger: (ratio: string) => `${ratio} times larger`,
    percentLarger: (percent: string) => `${percent}% larger`,
    overlay: 'Overlay',
    overlayCities: 'Overlay cities',
    clearAll: 'Clear all',
    remove: 'Remove',
    removeCity: (name: string) => `Remove ${name}`,
    footnote: '* Calculated from official OpenStreetMap administrative boundaries.',
    dragHint: 'Drag the outlines on the map to move them.',
    searchAnother: 'Search another city to compare',
    more: (count: number) => `+${count} more`,
    expandPanel: 'Expand panel',
    collapsePanel: 'Collapse panel',
    switchLanguage: 'Language',
  },
  es: {
    pageTitle: 'City Match | Compara el tamaño de ciudades',
    tagline: 'Huellas Globales',
    searchPlaceholder: 'Buscar ciudad…',
    searchLabel: 'Busca una ciudad (p. ej., París, Tokio, Madrid)',
    welcomeTitle: 'Compara ciudades del mundo',
    welcomeText: 'Busca ciudades arriba para ver su huella geográfica. Arrástralas por el mapa para descubrir cómo se comparan de verdad en tamaño.',
    close: 'Cerrar',
    activeLayers: 'Capas Activas',
    sizeComparison: 'Comparativa de Tamaño',
    is: 'es',
    than: 'que',
    timesLarger: (ratio: string) => `${ratio} veces más grande`,
    percentLarger: (percent: string) => `un ${percent}% más grande`,
    overlay: 'Superponer',
    overlayCities: 'Superponer ciudades',
    clearAll: 'Borrar todo',
    remove: 'Quitar',
    removeCity: (name: string) => `Quitar ${name}`,
    footnote: '* Cálculo basado en los límites administrativos oficiales de OpenStreetMap.',
    dragHint: 'Arrastra las siluetas en el mapa para moverlas.',
    searchAnother: 'Busca otra ciudad para comparar',
    more: (count: number) => `+${count} más`,
    expandPanel: 'Expandir panel',
    collapsePanel: 'Contraer panel',
    switchLanguage: 'Idioma',
  },
} satisfies Record<Language, Record<string, unknown>>;

export type Translations = typeof translations.en;

const detectLanguage = (): Language => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
  } catch {
    // Storage unavailable (private mode); fall back to the browser language
  }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
};

interface I18nValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
  formatNumber: (value: number) => string;
  /** "6 times larger" for big gaps, "35.2% larger" for close ones */
  formatDifference: (ratio: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(detectLanguage);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Choice just won't persist across visits
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = translations[lang].pageTitle;
  }, [lang]);

  const value = useMemo<I18nValue>(() => {
    const t = translations[lang];
    const formatNumber = (n: number) => n.toLocaleString(lang, { maximumFractionDigits: 1 });
    return {
      lang,
      setLang,
      t,
      formatNumber,
      formatDifference: (ratio: number) => ratio >= 2
        ? t.timesLarger(formatNumber(ratio))
        : t.percentLarger(formatNumber((ratio - 1) * 100)),
    };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
};
