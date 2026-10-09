
import React, { useState, useEffect, useRef } from 'react';
import { searchCities } from '../services/geoService';
import { NominatimSearchResult } from '../types';

interface SearchBoxProps {
  onCitySelect: (city: NominatimSearchResult) => void;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onCitySelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 2) {
        setIsLoading(true);
        const data = await searchCities(query);
        setResults(data.filter(r => r.geojson)); // Only cities with boundaries
        setIsLoading(false);
        setShowDropdown(true);
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-md z-[1001]" ref={dropdownRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a city (e.g., Paris, Tokyo, Madrid)..."
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
        {isLoading && (
          <div className="absolute right-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-2xl overflow-hidden">
          {results.map((result) => (
            <button
              key={result.place_id}
              onClick={() => {
                onCitySelect(result);
                setQuery('');
                setShowDropdown(false);
              }}
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
