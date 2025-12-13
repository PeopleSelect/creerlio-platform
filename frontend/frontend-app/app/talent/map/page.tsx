'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl, safeFetch } from '@/lib/api';
import { geocodeAddress, calculateRoute, searchNearby, calculateDistance, formatDistance } from '@/lib/mapboxUtils';
import { INDUSTRIES, AUSTRALIAN_CITIES, searchCities } from '@/lib/enums';
import MapLegendControl, { MapLayer } from '@/components/MapLegendControl';
import RouteCalculator, { RouteResult } from '@/components/RouteCalculator';
import SchoolFinder, { SchoolResult } from '@/components/SchoolFinder';
import PropertySearch from '@/components/PropertySearch';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Dynamic import to avoid SSR issues with Mapbox
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading map...</p>
      </div>
    </div>
  )
});

interface Business {
  id: string;
  name: string;
  industry: string;
  address?: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    postcode: string;
  };
  activelyHiring: boolean;
  openPositions: number;
  logo?: string;
  description?: string;
}

const ALL_INDUSTRIES = ['All', ...INDUSTRIES];
const DISTANCE_OPTIONS = [5, 10, 20, 50];

export default function TalentMapPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>('All');
  const [selectedDistance, setSelectedDistance] = useState<number>(20);
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [userHomeCoords, setUserHomeCoords] = useState<[number, number] | undefined>();
  const [mapCenter, setMapCenter] = useState<[number, number]>([151.2093, -33.8688]); // Sydney
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [routeOrigin, setRouteOrigin] = useState<{ latitude: number; longitude: number; address: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'route' | 'schools' | 'properties'>('route');
  const [schools, setSchools] = useState<SchoolResult[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [mapLayers, setMapLayers] = useState<MapLayer[]>([
    { id: 'platform-businesses', label: 'Platform Businesses', icon: null, color: '#3b82f6', visible: true, count: 0 },
    { id: 'external-businesses', label: 'External Businesses', icon: null, color: '#8b5cf6', visible: false, count: 0 },
    { id: 'schools', label: 'Schools', icon: null, color: '#10b981', visible: false, count: 0 },
    { id: 'properties-rent', label: 'Rental Properties', icon: null, color: '#f59e0b', visible: false, count: 0 },
    { id: 'properties-sale', label: 'Properties for Sale', icon: null, color: '#ef4444', visible: false, count: 0 },
    { id: 'transport', label: 'Public Transport', icon: null, color: '#6366f1', visible: false, count: 0 },
    { id: 'points-of-interest', label: 'Points of Interest', icon: null, color: '#ec4899', visible: false, count: 0 }
  ]);

  // Ensure client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load businesses from API
  useEffect(() => {
    if (!mounted) return;
    
    const loadBusinesses = async () => {
      setIsLoading(true);
      const apiBase = getApiBaseUrl();
      
      console.log('🗺️ Loading business markers from API...', {
        center: mapCenter,
        radius: selectedDistance
      });
      
      const { data, error} = await safeFetch(`${apiBase}/api/business/map/markers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: mapCenter[1],
          longitude: mapCenter[0],
          radiusKm: selectedDistance,
          limit: 100,
          hiringOnly: false
        })
      });

      if (error) {
        console.error('❌ Failed to load businesses:', error);
      } else if (data) {
        console.log('✅ Loaded', data.length, 'businesses');
        setBusinesses(data);
        setFilteredBusinesses(data);
      }
      
      setIsLoading(false);
    };

    loadBusinesses();
  }, [mounted, mapCenter, selectedDistance]);
  
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalJobs: 0,
    nearbySchools: 0,
    averageCommute: 0
  });

  // Load user home location from localStorage
  useEffect(() => {
    const savedHome = localStorage.getItem('userHomeLocation');
    if (savedHome) {
      try {
        const home = JSON.parse(savedHome);
        setUserHomeCoords([home.longitude, home.latitude]);
        setMapCenter([home.longitude, home.latitude]);
        // Set as initial route origin
        setRouteOrigin({
          latitude: home.latitude,
          longitude: home.longitude,
          address: home.address || 'Your Location'
        });
      } catch (e) {
        console.error('Error loading home location:', e);
      }
    }
  }, []);

  // Filter businesses by industry and distance
  useEffect(() => {
    let filtered = businesses;

    // Industry filter
    if (selectedIndustry !== 'All') {
      filtered = filtered.filter(b => b.industry === selectedIndustry);
    }

    // Distance filter (if user home is set)
    if (userHomeCoords) {
      filtered = filtered.filter(b => {
        const distance = calculateDistance(
          { latitude: userHomeCoords[1], longitude: userHomeCoords[0] },
          { latitude: b.location.latitude, longitude: b.location.longitude }
        );
        return distance <= selectedDistance;
      });
    }

    setFilteredBusinesses(filtered);

    // Update stats
    setStats({
      totalBusinesses: filtered.length,
      totalJobs: filtered.reduce((sum: number, b: Business) => sum + b.openPositions, 0),
      nearbySchools: 0, // TODO: Calculate from nearby search
      averageCommute: 0 // TODO: Calculate from routes
    });
  }, [businesses, selectedIndustry, selectedDistance, userHomeCoords]);

  // Handle search location
  const handleSearchLocation = async () => {
    if (!searchLocation.trim()) return;

    setIsLoading(true);
    try {
      const location = await geocodeAddress(searchLocation);
      if (location && location.coordinates) {
        setMapCenter([location.coordinates.longitude, location.coordinates.latitude]);
        setUserHomeCoords([location.coordinates.longitude, location.coordinates.latitude]);
        
        // Save to localStorage
        localStorage.setItem('userHomeLocation', JSON.stringify({
          address: location.address,
          longitude: location.coordinates.longitude,
          latitude: location.coordinates.latitude
        }));
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      alert('Could not find that location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle business click - calculate route
  const handleBusinessClick = async (business: Business) => {
    setSelectedBusiness(business);

    if (userHomeCoords) {
      setIsLoading(true);
      try {
        const route = await calculateRoute(
          { latitude: userHomeCoords[1], longitude: userHomeCoords[0] },
          { latitude: business.location.latitude, longitude: business.location.longitude },
          'driving'
        );

        if (route) {
          // Convert route to GeoJSON
          const coordinates = route.steps ? route.steps.flatMap((step: any) => 
            step.geometry?.coordinates || []
          ) : [];

          setRouteGeoJSON({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          });
        }
      } catch (error) {
        console.error('Error calculating route:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Clear route
  const clearRoute = () => {
    setRouteGeoJSON(null);
    setSelectedBusiness(null);
  };

  // Transform businesses to MapView format
  const transformedBusinesses = filteredBusinesses.map(b => ({
    id: b.id,
    name: b.name,
    industry: b.industry,
    address: b.address || `${b.location.city}, ${b.location.state}`,
    latitude: b.location.latitude,
    longitude: b.location.longitude,
    jobCount: b.openPositions,
    logo: b.logo,
    city: b.location.city,
    state: b.location.state,
    openPositions: b.openPositions,
    activelyHiring: b.activelyHiring
  }));

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🌟 Discover Your Next Workplace</h1>
              <p className="text-sm text-gray-600">Explore businesses, research locations, and connect proactively</p>
              <div className="mt-2 flex gap-2">
                <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium">Find Great Employers</span>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">Research Locations</span>
                <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">Proactive Recruiting</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/talent/portfolio/preview')} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 flex items-center gap-2">
                📤 Share Portfolio
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Welcome,</span>
                <span className="font-semibold text-gray-900">{user?.firstName || 'Guest'}</span>
              </div>
            </div>
          </div>

          {/* Search and filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Location search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Location
              </label>
              <div className="flex gap-2">
                <LocationAutocomplete
                  value={searchLocation}
                  onChange={(value, place) => {
                    setSearchLocation(value);
                    if (place) {
                      setMapCenter([place.lng, place.lat]);
                      setUserHomeCoords([place.lng, place.lat]);
                      localStorage.setItem('userHomeLocation', JSON.stringify({
                        address: value,
                        longitude: place.lng,
                        latitude: place.lat
                      }));
                    }
                  }}
                  placeholder="Enter address or suburb..."
                  className="flex-1"
                />
                <button
                  onClick={handleSearchLocation}
                  disabled={isLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? '...' : 'Go'}
                </button>
              </div>
            </div>

            {/* Industry filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                {ALL_INDUSTRIES.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            {/* Distance filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distance (km)
              </label>
              <div className="flex gap-2">
                {DISTANCE_OPTIONS.map(distance => (
                  <button
                    key={distance}
                    onClick={() => setSelectedDistance(distance)}
                    className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedDistance === distance
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {distance}km
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">
                <strong className="text-blue-700">{stats.totalBusinesses}</strong> <span className="text-amber-700">businesses to explore</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">
                <strong className="text-green-700">{stats.totalJobs}</strong> <span className="text-green-700">opportunities</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-purple-700">
                🎯 Make proactive connections
              </span>
            </div>
          </div>

          {selectedBusiness && routeGeoJSON && (
            <button
              onClick={clearRoute}
              className="px-4 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Clear Route
            </button>
          )}
        </div>
      </div>

      {/* Map and Sidebar */}
      <div className="flex-1 relative flex">
        {!userHomeCoords && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 shadow-lg max-w-md">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">Set your home location</p>
                <p className="text-xs text-blue-700 mt-1">Search for your address above to see businesses within your preferred distance and calculate commute times.</p>
              </div>
            </div>
          </div>
        )}

        <MapView
          businesses={transformedBusinesses}
          center={mapCenter}
          zoom={userHomeCoords ? 12 : 11}
          onBusinessClick={(b) => {
            // Find original business and call handler
            const original = filteredBusinesses.find(fb => fb.id === b.id);
            if (original) handleBusinessClick(original);
          }}
          showUserLocation={true}
          userHome={userHomeCoords}
          routeGeoJSON={routeGeoJSON}
          schools={schools}
          properties={properties}
          visibleLayers={mapLayers.filter(l => l.visible).map(l => l.id)}
        />

        {/* Map Legend */}
        <MapLegendControl
          layers={mapLayers.map(layer => ({ ...layer, count: layer.id === 'platform-businesses' ? stats.totalBusinesses : layer.id === 'schools' ? schools.length : layer.id === 'properties-rent' || layer.id === 'properties-sale' ? properties.length : 0 }))}
          onLayerToggle={(layerId, visible) => {
            setMapLayers(prev => prev.map(layer => 
              layer.id === layerId ? { ...layer, visible } : layer
            ));
          }}
        />

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white rounded-r-lg shadow-lg p-2 hover:bg-gray-50 transition-colors"
          style={{ left: showSidebar ? '400px' : '4px' }}
        >
          {showSidebar ? <ChevronLeft className="w-5 h-5 text-gray-600" /> : <ChevronRight className="w-5 h-5 text-gray-600" />}
        </button>

        {/* Sidebar with Tools */}
        {showSidebar && (
          <div className="absolute left-0 top-0 bottom-0 w-96 bg-white shadow-xl z-10 overflow-y-auto">
            {/* Sidebar Tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex">
                <button
                  onClick={() => setSidebarTab('route')}
                  className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
                    sidebarTab === 'route'
                      ? 'border-b-2 border-blue-600 text-blue-700 bg-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🚗 Routes
                </button>
                <button
                  onClick={() => setSidebarTab('schools')}
                  className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
                    sidebarTab === 'schools'
                      ? 'border-b-2 border-green-600 text-green-700 bg-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🎓 Schools
                </button>
                <button
                  onClick={() => setSidebarTab('properties')}
                  className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
                    sidebarTab === 'properties'
                      ? 'border-b-2 border-orange-600 text-orange-700 bg-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🏠 Properties
                </button>
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="p-4">
              {sidebarTab === 'route' && (
                <RouteCalculator
                  origin={routeOrigin}
                  destination={selectedBusiness ? { 
                    latitude: selectedBusiness.location.latitude, 
                    longitude: selectedBusiness.location.longitude,
                    name: selectedBusiness.name,
                    address: selectedBusiness.address || `${selectedBusiness.location.city}, ${selectedBusiness.location.state}`
                  } : null}
                  onRouteCalculated={(route: RouteResult) => {
                    console.log('Route calculated:', route);
                    if (route.geometry) {
                      setRouteGeoJSON(route.geometry);
                    }
                  }}
                  onOriginChange={(origin) => {
                    console.log('Origin changed:', origin);
                    setRouteOrigin(origin);
                    if (origin) {
                      // Update map center to show the new origin
                      setMapCenter([origin.longitude, origin.latitude]);
                      // Also update user home coords for map marker
                      setUserHomeCoords([origin.longitude, origin.latitude]);
                    }
                  }}
                />
              )}

              {sidebarTab === 'schools' && (
                <SchoolFinder
                  location={userHomeCoords ? { latitude: userHomeCoords[1], longitude: userHomeCoords[0] } : null}
                  onSchoolsFound={(foundSchools) => {
                    setSchools(foundSchools);
                    setMapLayers(prev => prev.map(layer => 
                      layer.id === 'schools' ? { ...layer, visible: true, count: foundSchools.length } : layer
                    ));
                  }}
                />
              )}

              {sidebarTab === 'properties' && (
                <PropertySearch
                  onPropertiesFound={(foundProperties, medianPrices) => {
                    setProperties(foundProperties);
                    console.log('Properties found:', foundProperties.length);
                    console.log('Median prices:', medianPrices);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
