'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiY3JlZXJsaW8iLCJhIjoiZGVtby10b2tlbiJ9.demo';

interface Business {
  id: string;
  name: string;
  industry: string;
  address: string;
  latitude: number;
  longitude: number;
  jobCount: number;
  logo?: string;
  city?: string;
  state?: string;
  openPositions?: number;
  activelyHiring?: boolean;
  distance?: number;
}

interface LocationIntelligence {
  housing: {
    medianHousePrice: string;
    medianRent: string;
    averageRent2Bed: string;
  };
  transport: {
    nearestStation: string;
    distanceToStation: string;
    weeklyTransportCost: string;
  };
}

interface School {
  id: string;
  name: string;
  type: string;
  location: { latitude: number; longitude: number };
  distance?: number;
}

interface Property {
  id: string;
  address: string;
  propertyType: string;
  bedrooms: number;
  price: number;
  location?: { latitude: number; longitude: number };
}

interface MapViewProps {
  businesses: Business[];
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  onBusinessClick?: (business: Business) => void;
  showUserLocation?: boolean;
  userHome?: [number, number];
  routeGeoJSON?: any;
  schools?: School[];
  properties?: Property[];
  visibleLayers?: string[];
}

export default function MapView({
  businesses,
  center = [151.2093, -33.8688], // Sydney default
  zoom = 12,
  onBusinessClick,
  showUserLocation = false,
  userHome,
  routeGeoJSON,
  schools = [],
  properties = [],
  visibleLayers = ['platform-businesses']
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [locationData, setLocationData] = useState<LocationIntelligence | null>(null);
  const [loadingLocationData, setLoadingLocationData] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom: zoom
  });

  // Update view when center changes
  useEffect(() => {
    setViewState({
      longitude: center[0],
      latitude: center[1],
      zoom: zoom
    });
  }, [center, zoom]);

  const handleMarkerClick = useCallback(async (business: Business) => {
    setSelectedBusiness(business);
    setLoadingLocationData(true);
    
    // Fetch location intelligence data
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://opulent-capybara-97gqpjqr69939pqw-5007.app.github.dev';
      const response = await fetch(`${apiBase}/api/location/intelligence/${business.id}`);
      if (response.ok) {
        const data = await response.json();
        setLocationData(data);
      } else {
        console.warn(`Location data not available for business ${business.id}`);
      }
    } catch (error) {
      console.warn('Location data fetch failed (non-critical):', error);
      // This is non-critical, just means we won't show location intelligence
    } finally {
      setLoadingLocationData(false);
    }
    
    if (onBusinessClick) {
      onBusinessClick(business);
    }
  }, [onBusinessClick]);

  const flyToBusiness = useCallback((business: Business) => {
    mapRef.current?.flyTo({
      center: [business.longitude, business.latitude],
      zoom: 14,
      duration: 2000
    });
  }, []);

  // Cluster businesses if too many
  const clusterBusinesses = (businesses: Business[]): Business[] => {
    // Simple clustering - group by proximity
    // In production, use Mapbox's built-in clustering
    return businesses;
  };

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Navigation controls */}
        <NavigationControl position="top-right" />
        
        {/* Geolocate control */}
        {showUserLocation && (
          <GeolocateControl
            position="top-right"
            trackUserLocation
            showUserHeading
          />
        )}

        {/* Point A - Your Location (Origin) */}
        {userHome && (
          <Marker
            longitude={userHome[0]}
            latitude={userHome[1]}
            anchor="bottom"
          >
            <div className="relative cursor-pointer" title="Your Location (Point A)">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-xl border-4 border-white animate-pulse">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                📍 Point A
              </div>
            </div>
          </Marker>
        )}

        {/* Route line */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                'line-color': '#FF6B35',
                'line-width': 4,
                'line-opacity': 0.8
              }}
            />
          </Source>
        )}

        {/* School markers */}
        {visibleLayers.includes('schools') && schools.map((school) => (
          <Marker
            key={`school-${school.id}`}
            longitude={school.location.longitude}
            latitude={school.location.latitude}
            anchor="bottom"
          >
            <div className="relative cursor-pointer group">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:bg-green-700 transition-colors hover:scale-110">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {school.name}
              </div>
            </div>
          </Marker>
        ))}

        {/* Property markers */}
        {(visibleLayers.includes('properties-rent') || visibleLayers.includes('properties-sale')) && properties.map((property) => {
          if (!property.location) return null;
          const isRent = property.propertyType === 'rent';
          const shouldShow = (isRent && visibleLayers.includes('properties-rent')) || (!isRent && visibleLayers.includes('properties-sale'));
          if (!shouldShow) return null;
          
          return (
            <Marker
              key={`property-${property.id}`}
              longitude={property.location.longitude}
              latitude={property.location.latitude}
              anchor="bottom"
            >
              <div className="relative cursor-pointer group">
                <div className={`w-8 h-8 ${isRent ? 'bg-orange-600' : 'bg-red-600'} rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:scale-110 transition-transform`}>
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </div>
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {property.bedrooms} bed • ${property.price.toLocaleString()}{isRent ? '/wk' : ''}
                </div>
              </div>
            </Marker>
          );
        })}

        {/* Business markers */}
        {visibleLayers.includes('platform-businesses') && businesses.map((business) => {
          const isSelected = selectedBusiness?.id === business.id;
          return (
          <Marker
            key={business.id}
            longitude={business.longitude}
            latitude={business.latitude}
            anchor="bottom"
            onClick={() => handleMarkerClick(business)}
          >
            <div className="relative cursor-pointer group" title={isSelected ? "Selected Business (Point B)" : business.name}>
              <div className={`${isSelected ? 'w-12 h-12 animate-pulse' : 'w-8 h-8'} ${isSelected ? 'bg-red-600 border-4' : 'bg-amber-600 border-2'} rounded-full flex items-center justify-center shadow-xl border-white hover:bg-amber-700 transition-all hover:scale-110`}>
                <svg className={`${isSelected ? 'w-7 h-7' : 'w-5 h-5'} text-white`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                </svg>
              </div>
              {isSelected && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                  🎯 Point B
                </div>
              )}
              {business.jobCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold border border-white">
                  {business.jobCount}
                </div>
              )}
              {!isSelected && (
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {business.name}
                </div>
              )}
            </div>
          </Marker>
        )})}

        {/* Business popup with location intelligence */}
        {selectedBusiness && (
          <Popup
            longitude={selectedBusiness.longitude}
            latitude={selectedBusiness.latitude}
            anchor="bottom"
            onClose={() => {
              setSelectedBusiness(null);
              setLocationData(null);
            }}
            closeButton={true}
            closeOnClick={false}
            className="business-popup"
            maxWidth="400px"
          >
            <div className="p-3 min-w-[350px]">
              <div className="flex items-start gap-3 mb-3">
                {selectedBusiness.logo && (
                  <img 
                    src={selectedBusiness.logo} 
                    alt={selectedBusiness.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{selectedBusiness.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">{selectedBusiness.industry}</p>
                  <p className="text-xs text-gray-500">{selectedBusiness.address}</p>
                  {selectedBusiness.distance && (
                    <p className="text-xs text-blue-600 mt-1">📍 {selectedBusiness.distance}km away</p>
                  )}
                </div>
              </div>
              
              {(selectedBusiness.jobCount || selectedBusiness.openPositions) && (
                <div className="flex items-center gap-2 text-sm mb-3 bg-green-50 px-3 py-2 rounded">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium text-green-800">
                    {selectedBusiness.openPositions || selectedBusiness.jobCount} open positions
                  </span>
                </div>
              )}

              {/* Location Intelligence Data */}
              {loadingLocationData && (
                <div className="text-center py-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs text-gray-600 mt-2">Loading location data...</p>
                </div>
              )}

              {locationData && !loadingLocationData && (
                <div className="space-y-2 mb-3 border-t pt-3">
                  <div className="text-xs font-semibold text-gray-700 mb-2">💰 Living Costs in {selectedBusiness.city}</div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-gray-600">Median Rent</div>
                      <div className="font-semibold text-blue-900">{locationData.housing.medianRent}/week</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-gray-600">House Price</div>
                      <div className="font-semibold text-blue-900">{locationData.housing.medianHousePrice}</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <div className="text-gray-600">Transport</div>
                      <div className="font-semibold text-green-900">{locationData.transport.weeklyTransportCost}/week</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <div className="text-gray-600">Station</div>
                      <div className="font-semibold text-green-900">{locationData.transport.distanceToStation}</div>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-2 rounded text-xs">
                    <div className="text-gray-600">Est. Monthly Living Cost</div>
                    <div className="font-bold text-amber-900 text-lg">
                      ${(
                        parseFloat(locationData.housing.averageRent2Bed.replace(/[^0-9.]/g, '')) * 4.33 +
                        parseFloat(locationData.transport.weeklyTransportCost.replace(/[^0-9.]/g, '')) * 4.33 +
                        1000
                      ).toFixed(0)}
                    </div>
                    <div className="text-gray-500 text-xs">Rent + Transport + Living expenses</div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => window.location.href = `/talent/business/${selectedBusiness.id}`}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition-colors"
                >
                  View Full Profile
                </button>
                <button
                  onClick={() => flyToBusiness(selectedBusiness)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm rounded font-medium transition-colors"
                >
                  🎯
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Map legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold text-gray-900 mb-2">Map Legend</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-600 rounded-full"></div>
            <span className="text-gray-700">Business Location</span>
          </div>
          {userHome && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700">Your Home</span>
            </div>
          )}
          {routeGeoJSON && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-amber-600 rounded"></div>
              <span className="text-gray-700">Route</span>
            </div>
          )}
        </div>
      </div>

      {/* Business count badge */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2">
        <div className="text-sm text-gray-600">Showing</div>
        <div className="text-2xl font-bold text-gray-900">{businesses.length}</div>
        <div className="text-sm text-gray-600">businesses</div>
      </div>
    </div>
  );
}
