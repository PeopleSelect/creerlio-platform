'use client';

import { useState, useEffect, useRef } from 'react';

export interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteDropdownProps {
  options: readonly string[] | AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  searchFn?: (query: string, limit?: number) => readonly string[];
  minChars?: number;
  debounceMs?: number;
  maxResults?: number;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function AutocompleteDropdown({
  options,
  value,
  onChange,
  placeholder = 'Type to search...',
  label,
  searchFn,
  minChars = 2,
  debounceMs = 300,
  maxResults = 20,
  allowCustom = false,
  className = '',
  disabled = false,
}: AutocompleteDropdownProps) {
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Normalize options to AutocompleteOption format
  const normalizedOptions: AutocompleteOption[] = options.map(opt =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Filter options based on input
  const filterOptions = (query: string) => {
    if (!query || query.length < minChars) {
      setFilteredOptions([]);
      return;
    }

    let results: AutocompleteOption[];
    
    if (searchFn) {
      // Use custom search function
      const searchResults = searchFn(query, maxResults);
      results = searchResults.map(r => 
        typeof r === 'string' ? { value: r, label: r } : r
      );
    } else {
      // Default: case-insensitive substring match
      const lowerQuery = query.toLowerCase();
      results = normalizedOptions
        .filter(opt => opt.label.toLowerCase().includes(lowerQuery))
        .slice(0, maxResults);
    }

    setFilteredOptions(results);
    setIsOpen(results.length > 0);
  };

  // Handle input change with debouncing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      filterOptions(inputValue);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If not allowing custom values and input doesn't match any option, reset
        if (!allowCustom && inputValue !== value) {
          setInputValue(value);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value, allowCustom]);

  // Sync input with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);
    
    if (allowCustom) {
      onChange(newValue);
    }
  };

  const handleOptionClick = (option: AutocompleteOption) => {
    setInputValue(option.label);
    onChange(option.value);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        filterOptions(inputValue);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
          handleOptionClick(filteredOptions[selectedIndex]);
        } else if (allowCustom && inputValue) {
          onChange(inputValue);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        if (!allowCustom) {
          setInputValue(value);
        }
        break;
    }
  };

  const handleInputFocus = () => {
    if (inputValue.length >= minChars) {
      filterOptions(inputValue);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {inputValue && !disabled && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.map((option, index) => (
            <div
              key={`${option.value}-${index}`}
              onClick={() => handleOptionClick(option)}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-amber-100 text-amber-900'
                  : 'hover:bg-gray-100'
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}

      {inputValue && inputValue.length < minChars && (
        <p className="text-xs text-gray-500 mt-1">
          Type at least {minChars} characters to search
        </p>
      )}
    </div>
  );
}
