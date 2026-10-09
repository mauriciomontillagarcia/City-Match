
import React, { useEffect, useRef, useState } from 'react';
import { CityBoundary } from '../types';
import { Comparison } from '../services/comparison';
import { useI18n } from '../i18n';

interface MobileSheetProps {
  cities: CityBoundary[];
  comparison: Comparison | null;
  onRemove: (id: string) => void;
  onOverlay: () => void;
  onClearAll: () => void;
  onHeightChange: (height: number) => void;
}

// Vertical distance (px) that counts as a swipe on the sheet handle
const SWIPE_THRESHOLD = 30;

const MobileSheet: React.FC<MobileSheetProps> = ({
  cities,
  comparison,
  onRemove,
  onOverlay,
  onClearAll,
  onHeightChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { t, formatNumber, formatDifference } = useI18n();
  const sheetRef = useRef<HTMLDivElement>(null);
  const swipeStartY = useRef<number | null>(null);
  const swiped = useRef(false);

  // Report the visible height so map controls/attribution can sit above the sheet.
  // The sheet is display:none on desktop, which reports 0.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => onHeightChange(el.offsetHeight));
    observer.observe(el);
    return () => {
      observer.disconnect();
      onHeightChange(0);
    };
  }, [onHeightChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    swipeStartY.current = e.clientY;
    swiped.current = false;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (swipeStartY.current === null) return;
    const dy = e.clientY - swipeStartY.current;
    swipeStartY.current = null;
    if (Math.abs(dy) > SWIPE_THRESHOLD) {
      swiped.current = true;
      setExpanded(dy < 0);
    }
  };

  const handleToggle = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    setExpanded(v => !v);
  };

  return (
    <div
      ref={sheetRef}
      className="md:hidden absolute inset-x-0 bottom-0 z-[1001] bg-white/95 backdrop-blur-xl rounded-t-[1.75rem] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] border-t border-white pb-[env(safe-area-inset-bottom)]"
    >
      <button
        type="button"
        onClick={handleToggle}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        aria-expanded={expanded}
        aria-label={expanded ? t.collapsePanel : t.expandPanel}
        className="w-full px-5 pt-2 pb-3 text-left touch-none select-none"
      >
        <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-3" />

        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            {cities.slice(0, 2).map(city => (
              <div key={city.id} className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: city.color }} />
                <span className="text-sm font-semibold text-slate-800 truncate">{city.name}</span>
                <span className="text-sm font-bold text-slate-500 shrink-0 ml-auto">
                  {formatNumber(city.areaKm2)} <small className="text-[10px] font-medium text-slate-400">km²</small>
                </span>
              </div>
            ))}
            {cities.length > 2 && (
              <p className="text-xs text-slate-400 font-semibold">{t.more(cities.length - 2)}</p>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>

        <p className="mt-2 text-sm font-semibold text-slate-600 leading-snug">
          {comparison ? (
            <>
              <span className="text-blue-600 font-black">{comparison.larger.name}</span> {t.is}{' '}
              <span className="text-blue-600 font-black">{formatDifference(comparison.ratio)}</span> {t.than}{' '}
              <span className="text-blue-600 font-black">{comparison.smaller.name}</span>
            </>
          ) : (
            <span className="text-slate-400">{t.searchAnother}</span>
          )}
        </p>
      </button>

      {expanded && (
        <div className="px-5 pb-4 max-h-[45dvh] overflow-y-auto">
          <div className="border-t border-slate-100 pt-3">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t.activeLayers}</h2>
            <ul>
              {cities.map(city => (
                <li key={city.id} className="flex items-center gap-3 py-1">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: city.color }} />
                  <span className="text-sm font-semibold text-slate-700 truncate flex-1">{city.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(city.id)}
                    className="w-11 h-11 -mr-2 flex items-center justify-center text-slate-400 active:text-red-500 active:bg-red-50 rounded-xl"
                    aria-label={t.removeCity(city.name)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[10px] text-slate-400 font-medium italic mt-2">
            {t.footnote} {t.dragHint}
          </p>
        </div>
      )}

      <div className="flex gap-2 px-5 pb-4">
        {cities.length >= 2 && (
          <button
            type="button"
            onClick={onOverlay}
            className="flex-1 h-11 rounded-2xl bg-blue-600 active:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
            {t.overlay}
          </button>
        )}
        <button
          type="button"
          onClick={onClearAll}
          className={`${cities.length >= 2 ? 'px-4' : 'flex-1'} h-11 rounded-2xl bg-slate-100 active:bg-red-50 text-slate-500 active:text-red-500 text-sm font-bold`}
        >
          {t.clearAll}
        </button>
      </div>
    </div>
  );
};

export default MobileSheet;
