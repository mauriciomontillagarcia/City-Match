
import React, { useState, useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import SearchBox from './components/SearchBox';
import DraggableCity from './components/DraggableCity';
import { CityBoundary, NominatimSearchResult } from './types';
import { calculateArea } from './services/geoService';

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
];

const App: React.FC = () => {
  const [selectedCities, setSelectedCities] = useState<CityBoundary[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [map, setMap] = useState<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

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

    L.control.zoom({ position: 'bottomright' }).addTo(initialMap);

    setMap(initialMap);

    return () => {
      initialMap.remove();
    };
  }, []);

  const handleCitySelect = useCallback((result: NominatimSearchResult) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const centroid: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    
    const color = COLORS[selectedCities.length % COLORS.length];
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

    setSelectedCities(prev => [...prev, newCity]);
    setShowWelcome(false); // Hide welcome when a city is selected

    if (map) {
      map.flyTo(currentPosition, 10, { duration: 1.5 });
    }
  }, [selectedCities, map]);

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

  const renderComparison = () => {
    if (selectedCities.length < 2) return null;

    const city1 = selectedCities[0];
    const city2 = selectedCities[1];
    
    const larger = city1.areaKm2 > city2.areaKm2 ? city1 : city2;
    const smaller = city1.areaKm2 > city2.areaKm2 ? city2 : city1;
    
    const diffPercent = ((larger.areaKm2 - smaller.areaKm2) / smaller.areaKm2) * 100;

    return (
      <div className="bg-white/90 backdrop-blur-lg border border-white/60 p-6 rounded-[2rem] shadow-2xl pointer-events-auto animate-in slide-in-from-left-4 fade-in duration-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Comparativa de Tamaño</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{larger.name}</span>
              <span className="text-xl font-black text-slate-800">{larger.areaKm2.toLocaleString(undefined, { maximumFractionDigits: 1 })} <small className="text-xs font-medium text-slate-400">km²</small></span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{smaller.name}</span>
              <span className="text-lg font-bold text-slate-600">{smaller.areaKm2.toLocaleString(undefined, { maximumFractionDigits: 1 })} <small className="text-xs font-medium text-slate-400">km²</small></span>
            </div>
          </div>

          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
            <p className="text-sm font-semibold text-slate-700 leading-relaxed">
              <span className="text-blue-600 font-black">{larger.name}</span> es un <span className="text-blue-600 font-black">{diffPercent.toFixed(1)}%</span> más grande que <span className="text-blue-600 font-black">{smaller.name}</span>.
            </p>
          </div>
          
          <p className="text-[10px] text-slate-400 font-medium italic">
            * Cálculo basado en los límites administrativos oficiales de OpenStreetMap.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full relative bg-slate-50 font-sans text-slate-900">
      {/* Background Map */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 z-0 h-full w-full"
      />

      {/* Floating Header */}
      <header className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] w-full max-w-4xl px-4 pointer-events-none">
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-3xl p-3 flex items-center justify-between pointer-events-auto transition-all hover:shadow-[0_8px_48px_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-4 pl-4 mr-6 shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight text-slate-800">City Size Comparison</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Global Footprints</p>
            </div>
          </div>

          <div className="flex-grow">
            <SearchBox onCitySelect={handleCitySelect} />
          </div>

          <div className="flex gap-2 ml-4 mr-1 shrink-0">
            {selectedCities.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-2xl group"
                title="Clear All"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Side Panels */}
      <div className="absolute left-6 top-32 bottom-10 z-[1001] w-80 flex flex-col gap-4 pointer-events-none overflow-hidden">
        {selectedCities.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg border border-white/50 p-5 rounded-[2rem] shadow-2xl pointer-events-auto animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Capas Activas</h2>
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
                  <button 
                    onClick={() => handleRemove(city.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
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

      {/* Map Components */}
      {map && selectedCities.map(city => (
        <DraggableCity 
          key={city.id} 
          city={city} 
          map={map} 
          onDrag={handleDrag}
          onRemove={handleRemove}
        />
      ))}

      {/* Initial Landing UI */}
      {selectedCities.length === 0 && showWelcome && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] text-center max-w-sm pointer-events-none px-6">
           <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.1)] border border-white relative pointer-events-auto">
             <button 
                onClick={() => setShowWelcome(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                title="Close"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>
             
             <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <rect x="4" y="4" width="12" height="12" rx="2" strokeWidth="2" />
                 <rect x="8" y="8" width="12" height="12" rx="2" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
               </svg>
             </div>
             <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">World City Comparison</h2>
             <p className="text-slate-500 leading-relaxed font-medium">
               Search for cities above to visualize their geographic footprints. Drag them across the map to see how they truly compare in size.
             </p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
