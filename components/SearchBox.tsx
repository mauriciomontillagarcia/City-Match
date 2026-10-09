
import React, { useState, useEffect, useRef } from 'react';
import { searchCities } from '../services/geoService';
import { NominatimSearchResult } from '../types';
import { useI18n } from '../i18n';

interface SearchBoxProps {
  onCitySelect: (city: NominatimSearchResult) => void;
}

type SearchStatus = 'idle' | 'loading' | 'done' | 'error';

const SearchBox: React.FC<SearchBoxProps> = ({ onCitySelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimSearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, lang } = useI18n();

  useEffect(() => {
    if (query.trim().length <= 2) {
      setResults([]);
      setStatus('idle');
      setShowDropdown(false);
      return;
    }

    // Aborting on every new keystroke keeps a slow, older response from
    // overwriting the results of the latest query
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const data = await searchCities(query.trim(), lang, controller.signal);
        setResults(data);
        setStatus('done');
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Error searching cities:', error);
        setResults([]);
        setStatus('error');
      }
      setShowDropdown(true);
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, lang]);

  const selectResult = (result: NominatimSearchResult) => {
    onCitySelect(result);
    setQuery('');
    setShowDropdown(false);
    inputRef.current?.blur(); // Close the on-screen keyboard
  };

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-md z-[1001]" ref={dropdownRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => status !== 'idle' && setShowDropdown(true)}
          onKeyDown={(e) => {
            // Keyboard "search" key picks the top result
            if (e.key === 'Enter' && results.length > 0) {
              e.preventDefault();
              selectResult(results[0]);
            }
          }}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchLabel}
          className="w-full px-4 py-3 pl-10 bg-white border border-slate-200 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-700"
        />
        <svg 
          className="absolute left-3 w-5 h-5 text-slate-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {status === 'loading' && (
          <div className="absolute right-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {showDropdown && (status === 'error' || (status === 'done' && results.length === 0)) && (
        <div role="status" className="absolute top-full mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-2xl px-4 py-3 text-sm font-medium text-slate-500">
          {status === 'error' ? t.searchError : t.noResults}
        </div>
      )}

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-2xl overflow-y-auto max-h-[60dvh]">
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => selectResult(result)}
              className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors flex flex-col"
            >
              <span className="font-medium text-slate-800 truncate">
                {result.display_name.split(',')[0]}
              </span>
              <span className="text-xs text-slate-400 truncate">
                {result.display_name.split(',').slice(1).join(',').trim()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBox;
