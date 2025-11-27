'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader } from 'lucide-react';
import { AUSTRALIAN_CITIES, searchCities, type AustralianCity } from '@/lib/enums';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string, place?: any) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Start typing suburb or city...",
  className = ""
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AustralianCity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (inputValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    
    // Use comprehensive searchCities helper (searches name, state, postcode, region)
    const filtered = searchCities(inputValue).slice(0, 15); // Show top 15 results

    setSuggestions(filtered);
    setShowSuggestions(true);
    setLoading(false);
  };

  const selectSuggestion = (city: AustralianCity) => {
    const placeName = `${city.name}, ${city.state}`;
    onChange(placeName, { ...city, lat: city.lat, lng: city.lng });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => value.length >= 2 && setShowSuggestions(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${className}`}
        />
        {loading && (
          <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 animate-spin" />
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {suggestions.map((city) => (
            <button
              key={city.id}
              onClick={() => selectSuggestion(city)}
              className="w-full px-4 py-3 text-left hover:bg-amber-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{city.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {city.state} {city.postcode} · {city.region}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {showSuggestions && suggestions.length === 0 && value.length >= 2 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl p-4 text-center text-gray-500 text-sm">
          No locations found for "{value}"
        </div>
      )}
    </div>
  );
}
