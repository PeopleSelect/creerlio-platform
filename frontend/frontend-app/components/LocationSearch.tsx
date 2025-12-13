'use client';

import { useState } from 'react';
import AutocompleteDropdown from './AutocompleteDropdown';
import { AUSTRALIAN_CITIES, AUSTRALIAN_STATES, StateCode, searchCities } from '@/lib/enums/locations';

interface LocationSearchProps {
  value: {
    state?: string;
    city?: string;
    suburb?: string;
    postcode?: string;
  };
  onChange: (location: {
    state?: string;
    city?: string;
    suburb?: string;
    postcode?: string;
  }) => void;
  className?: string;
}

export default function LocationSearch({ value, onChange, className = '' }: LocationSearchProps) {
  const [selectedState, setSelectedState] = useState<StateCode | ''>(value.state as StateCode || '');

  const handleStateChange = (stateCode: string) => {
    setSelectedState(stateCode as StateCode);
    onChange({
      ...value,
      state: stateCode,
      city: '', // Reset city when state changes
    });
  };

  const handleCityChange = (city: string) => {
    onChange({
      ...value,
      city,
    });
  };

  const getCitiesForState = (): readonly string[] => {
    if (!selectedState) return [];
    return AUSTRALIAN_CITIES[selectedState] || [];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* State Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          State / Territory
        </label>
        <select
          value={selectedState}
          onChange={(e) => handleStateChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="">Select a state...</option>
          {AUSTRALIAN_STATES.map(state => (
            <option key={state.code} value={state.code}>
              {state.name} ({state.code})
            </option>
          ))}
        </select>
      </div>

      {/* City/Town Autocomplete */}
      {selectedState && (
        <AutocompleteDropdown
          options={getCitiesForState()}
          value={value.city || ''}
          onChange={handleCityChange}
          label="City / Town"
          placeholder="Start typing to search..."
          searchFn={(query) => searchCities(query, 20)}
          minChars={2}
          debounceMs={300}
          maxResults={20}
          allowCustom={true}
        />
      )}

      {/* Suburb (optional) */}
      {value.city && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Suburb (Optional)
          </label>
          <input
            type="text"
            value={value.suburb || ''}
            onChange={(e) => onChange({ ...value, suburb: e.target.value })}
            placeholder="Enter suburb..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Postcode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Postcode (Optional)
        </label>
        <input
          type="text"
          value={value.postcode || ''}
          onChange={(e) => onChange({ ...value, postcode: e.target.value })}
          placeholder="Enter postcode..."
          maxLength={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}
