
import React, { useState, useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import SearchBox from './components/SearchBox';
import DraggableCity from './components/DraggableCity';
import MobileSheet from './components/MobileSheet';
import LanguageToggle from './components/LanguageToggle';
import { CityBoundary, NominatimSearchResult } from './types';
import { calculateArea, shiftGeometry } from './services/geoService';
import { compareCities } from './services/comparison';
import { useI18n } from './i18n';

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
];

// Same breakpoint as Tailwind's `md`, where the side panel replaces the bottom sheet
const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;
const isTouchDevice = () => window.matchMedia('(pointer: coarse)').matches;

// Collapsed sheet height used before it has been measured
const FALLBACK_SHEET_HEIGHT = 150;

const App: React.FC = () => {
  const [selectedCities, setSelectedCities] = useState<CityBoundary[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [map, setMap] = useState<L.Map | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const sheetHeightRef = useRef(0);
  const { t, formatNumber, formatDifference } = useI18n();

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || map) return;

    const initialMap = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: false,
      worldCopyJump: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxNativeZoom: 19,
      referrerPolicy: 'strict-origin-when-cross-origin',
      maxZoom: 20
    }).addTo(initialMap);

    // Touch devices zoom with pinch; the buttons would only take space
    if (!isTouchDevice()) {
      L.control.zoom({ position: 'bottomright' }).addTo(initialMap);
    }

    setMap(initialMap);

    return () => {
      initialMap.remove();
    };
  }, []);

  const handleSheetHeight = useCallback((height: number) => {
    sheetHeightRef.current = height;
    setSheetHeight(height);
  }, []);

  // Fit the rendered outlines into the area not covered by the floating UI
  const fitCities = useCallback((cities: CityBoundary[]) => {
    if (!map || cities.length === 0) return;
    const bounds = L.latLngBounds([]);
    cities.forEach(c => {
      bounds.extend(L.polygon(shiftGeometry(c.geojson, c.centroid, c.currentPosition)).getBounds());
    });
    if (!bounds.isValid()) return;

    const padding = isDesktop()
      ? { paddingTopLeft: L.point(380, 130), paddingBottomRight: L.point(70, 50) }
      : {
          paddingTopLeft: L.point(24, 110),
          paddingBottomRight: L.point(24, (sheetHeightRef.current || FALLBACK_SHEET_HEIGHT) + 24),
        };
    map.flyToBounds(bounds, { ...padding, maxZoom: 14, duration: 1.2 });
  }, [map]);

  const handleCitySelect = useCallback((result: NominatimSearchResult) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const centroid: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];

    // First color not in use, so removing a city doesn't lead to duplicates
    const color = COLORS.find(c => !selectedCities.some(s => s.color === c))
      ?? COLORS[selectedCities.length % COLORS.length];
    const areaKm2 = calculateArea(result.geojson);

    // If there's already a city, place the new one on top of the first one
    const currentPosition: [number, number] = selectedCities.length > 0
      ? [selectedCities[0].currentPosition[0], selectedCities[0].currentPosition[1]]
      : centroid;

    const newCity: CityBoundary = {
      id: newId,
      name: result.display_name.split(',')[0],
      displayName: result.display_name,
      areaKm2,
      color,
      geojson: result.geojson,
      centroid,
      currentPosition,
    };

    const nextCities = [...selectedCities, newCity];
    setSelectedCities(nextCities);
    setShowWelcome(false); // Hide welcome when a city is selected
    fitCities(nextCities);
  }, [selectedCities, fitCities]);

  const handleDrag = useCallback((id: string, newPos: [number, number]) => {
    setSelectedCities(prev => prev.map(c =>
      c.id === id ? { ...c, currentPosition: newPos } : c
    ));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setSelectedCities(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleClearAll = () => {
    setSelectedCities([]);
  };

  // Stack every outline on the first city's current position
  const handleOverlay = () => {
    if (selectedCities.length < 2) return;
    const anchor = selectedCities[0].currentPosition;
    const nextCities = selectedCities.map(c => ({ ...c, currentPosition: anchor }));
    setSelectedCities(nextCities);
    fitCities(nextCities);
  };

  const comparison = compareCities(selectedCities);

  const renderComparison = () => {
    if (!comparison) return null;
    const { larger, smaller, ratio } = comparison;

    return (
      <div className="bg-white/90 backdrop-blur-lg border border-white/60 p-6 rounded-[2rem] shadow-2xl pointer-events-auto animate-in slide-in-from-left-4 fade-in duration-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{t.sizeComparison}</h2>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{larger.name}</span>
              <span className="text-xl font-black text-slate-800">{formatNumber(larger.areaKm2)} <small className="text-xs font-medium text-slate-400">km²</small></span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{smaller.name}</span>
              <span className="text-lg font-bold text-slate-600">{formatNumber(smaller.areaKm2)} <small className="text-xs font-medium text-slate-400">km²</small></span>
            </div>
          </div>

          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
            <p className="text-sm font-semibold text-slate-700 leading-relaxed">
              <span className="text-blue-600 font-black">{larger.name}</span> {t.is} <span className="text-blue-600 font-black">{formatDifference(ratio)}</span> {t.than} <span className="text-blue-600 font-black">{smaller.name}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOverlay}
            className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors"
          >
            {t.overlayCities}
          </button>

          <p className="text-[10px] text-slate-400 font-medium italic">
            {t.footnote}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex flex-col h-[100dvh] w-full relative bg-slate-50 font-sans text-slate-900 overflow-hidden"
      style={{ '--sheet-offset': `${sheetHeight}px` } as React.CSSProperties}
    >
      {/* Background Map */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 z-0 h-full w-full"
      />

      {/* Floating Header */}
      <header className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] sm:top-[calc(env(safe-area-inset-top)+1.5rem)] left-1/2 -translate-x-1/2 z-[2000] w-full max-w-4xl px-3 sm:px-4 pointer-events-none">
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-3xl p-2 sm:p-3 flex items-center justify-between pointer-events-auto transition-all hover:shadow-[0_8px_48px_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-3 pl-1 sm:pl-3 mr-2 sm:mr-6 shrink-0">
            <div className="city-match-mark w-11 h-11 sm:w-14 sm:h-14 rounded-xl" aria-hidden="true">
              <img src="/city-match-logo.png" alt="" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight text-slate-800">City <span className="text-blue-600">Match</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">{t.tagline}</p>
            </div>
          </div>

          <div className="flex-grow min-w-0">
            <SearchBox onCitySelect={handleCitySelect} />
          </div>

          <div className="flex items-center gap-2 ml-2 sm:ml-4 sm:mr-1 shrink-0">
            {/* On mobile, "clear all" lives in the bottom sheet */}
            {selectedCities.length > 0 && (
              <button
                onClick={handleClearAll}
                className="hidden md:block p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-2xl group"
                title={t.clearAll}
                aria-label={t.clearAll}
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Side Panels (desktop) */}
      <div className="hidden md:flex absolute left-6 top-32 bottom-10 z-[1001] w-80 flex-col gap-4 pointer-events-none overflow-hidden">
        {selectedCities.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg border border-white/50 p-5 rounded-[2rem] shadow-2xl pointer-events-auto animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t.activeLayers}</h2>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{selectedCities.length}</span>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
              {selectedCities.map((city) => (
                <div key={city.id} className="flex items-center justify-between group p-2 hover:bg-slate-50/50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{ backgroundColor: city.color }}
                    />
                    <span className="text-sm font-semibold text-slate-700 truncate max-w-[140px]">{city.name}</span>
                  </div>
                  {/* Hover-reveal only where hover exists (not on touch tablets) */}
                  <button
                    onClick={() => handleRemove(city.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus:opacity-100"
                    aria-label={t.removeCity(city.name)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {renderComparison()}
      </div>

      {/* Bottom Sheet (mobile) */}
      {selectedCities.length > 0 && (
        <MobileSheet
          cities={selectedCities}
          comparison={comparison}
          onRemove={handleRemove}
          onOverlay={handleOverlay}
          onClearAll={handleClearAll}
          onHeightChange={handleSheetHeight}
        />
      )}

      {/* Map Components */}
      {map && selectedCities.map(city => (
        <DraggableCity
          key={city.id}
          city={city}
          map={map}
          onDrag={handleDrag}
          onRemove={handleRemove}
          removeLabel={t.remove}
          formatNumber={formatNumber}
        />
      ))}

      {/* Initial Landing UI */}
      {selectedCities.length === 0 && showWelcome && (
        <div className="absolute inset-0 z-[1001] flex items-center justify-center p-4 pt-24 pointer-events-none">
           <div className="w-full max-w-sm text-center bg-white/90 backdrop-blur-xl p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.1)] border border-white relative pointer-events-auto">
             <button
                onClick={() => setShowWelcome(false)}
                className="absolute top-3 right-3 sm:top-6 sm:right-6 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                title={t.close}
                aria-label={t.close}
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>

             <img src="/city-match-logo.png" alt="City Match" width="1254" height="1254" className="w-28 h-28 sm:w-44 sm:h-44 object-contain mx-auto mb-3 rounded-2xl" />
             <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-3 tracking-tight">{t.welcomeTitle}</h2>
             <p className="text-sm sm:text-base text-slate-500 leading-relaxed font-medium">
               {t.welcomeText}
             </p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
