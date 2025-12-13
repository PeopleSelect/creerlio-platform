'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Building2, Users, Briefcase, Target, Bell, Map as MapIcon, List } from 'lucide-react';
import { INDUSTRIES, AUSTRALIAN_STATES, BUSINESS_SIZES } from '@/lib/enums';
import { getApiBaseUrl } from '@/lib/api';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface BusinessSearchFilters {
  query: string;
  location: {
    city: string;
    state: string;
    radius: number; // in km
  };
  industry: string[];
  businessSize: string[];
  employmentTypes: string[];
  activelyHiring: boolean;
  hasPositions: boolean;
}

interface Business {
  id: string;
  name: string;
  industry: string;
  location: {
    city: string;
    state: string;
    suburb: string;
    postcode: string;
  };
  distance?: number; // km from search location
  size: string;
  activelyHiring: boolean;
  openPositions: number;
  description: string;
  specializations: string[];
  established?: number;
  logo?: string;
}

interface SearchNotificationRequest {
  searchQuery: string;
  location: string;
  radius: number;
  industry: string;
  criteria: Record<string, any>;
  timestamp: string;
  talentId: string;
}

export default function BusinessSearch() {
  const [filters, setFilters] = useState<BusinessSearchFilters>({
    query: '',
    location: {
      city: '',
      state: '',
      radius: 10,
    },
    industry: [],
    businessSize: [],
    employmentTypes: [],
    activelyHiring: false,
    hasPositions: false,
  });

  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [noResultsNotificationSent, setNoResultsNotificationSent] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const radiusOptions = [1, 2, 5, 10, 15, 20, 25, 50, 75, 100, 150, 200];

  const handleSearch = async () => {
    setLoading(true);
    setNoResultsNotificationSent(false);

    try {
      console.log('🔍 Search filters:', filters);
      
      // Call REAL backend API
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/business/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(filters)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Search results:', data);
      
      // Backend returns { businesses: [], count: number, searchCriteria: {} }
      const businesses = data.businesses || [];
      setResults(businesses);

      // If no results, send notification to platform admin
      if (businesses.length === 0) {
        await sendNoResultsNotification();
      }
    } catch (error) {
      console.error('Business search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const sendNoResultsNotification = async () => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    const notification: SearchNotificationRequest = {
      searchQuery: filters.query,
      location: `${filters.location.city}, ${filters.location.state}`,
      radius: filters.location.radius,
      industry: filters.industry.join(', '),
      criteria: {
        businessSize: filters.businessSize,
        employmentTypes: filters.employmentTypes,
        activelyHiring: filters.activelyHiring,
        hasPositions: filters.hasPositions,
      },
      timestamp: new Date().toISOString(),
      talentId: userData.userId,
    };

    try {
      await fetch('/api/notifications/no-business-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(notification),
      });
      setNoResultsNotificationSent(true);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleLocationChange = (field: 'city' | 'state', value: string) => {
    setFilters({
      ...filters,
      location: { ...filters.location, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      {/* Main Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search businesses by name, industry, or keywords..."
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Location Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="City (e.g., Parramatta)"
              value={filters.location.city}
              onChange={(e) => handleLocationChange('city', e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          <select
            value={filters.location.state}
            onChange={(e) => handleLocationChange('state', e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="">Select State</option>
            {AUSTRALIAN_STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>

          <select
            value={filters.location.radius}
            onChange={(e) =>
              setFilters({
                ...filters,
                location: { ...filters.location, radius: parseInt(e.target.value) },
              })
            }
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {radiusOptions.map((km) => (
              <option key={km} value={km}>
                Within {km} km
              </option>
            ))}
          </select>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => setFilters({ ...filters, activelyHiring: !filters.activelyHiring })}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filters.activelyHiring
                ? 'bg-green-100 text-green-700 border-2 border-green-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Target className="inline w-4 h-4 mr-2" />
            Actively Hiring
          </button>

          <button
            onClick={() => setFilters({ ...filters, hasPositions: !filters.hasPositions })}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filters.hasPositions
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Briefcase className="inline w-4 h-4 mr-2" />
            Has Open Positions
          </button>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Advanced Filters {showAdvancedFilters ? '−' : '+'}
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Industries</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {INDUSTRIES.slice(0, 12).map((industry) => (
                  <label key={industry} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.industry.includes(industry)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({ ...filters, industry: [...filters.industry, industry] });
                        } else {
                          setFilters({
                            ...filters,
                            industry: filters.industry.filter((i) => i !== industry),
                          });
                        }
                      }}
                      className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-700">{industry}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Size</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {BUSINESS_SIZES.map((size) => (
                  <label key={size.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.businessSize.includes(size.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({ ...filters, businessSize: [...filters.businessSize, size.value] });
                        } else {
                          setFilters({
                            ...filters,
                            businessSize: filters.businessSize.filter((s) => s !== size.value),
                          });
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{size.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex-1 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search Businesses'}
          </button>
          
          {/* View Mode Toggle */}
          {results.length > 0 && (
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-3 font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-3 font-medium transition-colors border-l border-gray-300 ${
                  viewMode === 'map'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                title="Map View"
              >
                <MapIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* No Results Notification */}
      {results.length === 0 && noResultsNotificationSent && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start">
            <Bell className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-blue-800 font-semibold">We've notified our team!</h3>
              <p className="text-blue-700 text-sm mt-1">
                No businesses matching your search were found. We've sent a notification to our team to reach out
                to potential businesses in your area that match your criteria. We'll update you when new businesses
                join the platform.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && viewMode === 'list' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {results.length} {results.length === 1 ? 'Business' : 'Businesses'} Found
          </h2>

          {results.map((business) => (
            <div
              key={business.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {business.logo ? (
                    <img src={business.logo} alt={business.name} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{business.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{business.industry}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {business.location.suburb}, {business.location.state}
                        {business.distance && ` • ${business.distance.toFixed(1)} km away`}
                      </span>
                      <span className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {business.size}
                      </span>
                    </div>
                  </div>
                </div>

                {business.activelyHiring && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    Actively Hiring
                  </span>
                )}
              </div>

              <p className="text-gray-700 mt-4">{business.description}</p>

              {business.openPositions > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 font-medium">
                    <Briefcase className="inline w-4 h-4 mr-2" />
                    {business.openPositions} open {business.openPositions === 1 ? 'position' : 'positions'}
                  </p>
                </div>
              )}

              {business.specializations.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Specializations:</h4>
                  <div className="flex flex-wrap gap-2">
                    {business.specializations.map((spec, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button 
                  onClick={() => window.location.href = `/talent/business/${business.id}`}
                  className="flex-1 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
                >
                  View Profile
                </button>
                <button className="flex-1 py-2 border-2 border-amber-600 text-amber-700 rounded-lg font-medium hover:bg-amber-50 transition-colors">
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map View */}
      {viewMode === 'map' && results.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: '600px' }}>
          <MapView 
            businesses={results.map(b => ({
              id: b.id,
              name: b.name,
              industry: b.industry,
              address: `${b.location.suburb}, ${b.location.state}`,
              latitude: -33.8150, // TODO: Add actual coordinates to search results
              longitude: 151.0052,
              jobCount: b.openPositions,
              city: b.location.city,
              state: b.location.state,
              openPositions: b.openPositions,
              activelyHiring: b.activelyHiring,
              distance: b.distance
            }))}
            center={[151.0052, -33.8150]}
            zoom={11}
            onBusinessClick={(business: any) => {
              window.location.href = `/talent/business/${business.id}`;
            }}
          />
        </div>
      )}
    </div>
  );
}
