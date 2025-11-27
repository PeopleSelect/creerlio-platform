'use client';

import { useState, useEffect } from 'react';
import { Car, Train, Bike, Footprints, DollarSign, Clock, MapPin, Navigation, Home, Building2 } from 'lucide-react';

interface RouteCalculatorProps {
  origin: { latitude: number; longitude: number; address?: string } | null;
  destination: { latitude: number; longitude: number; name?: string; address?: string } | null;
  onRouteCalculated: (route: RouteResult) => void;
  onOriginChange?: (origin: { latitude: number; longitude: number; address: string } | null) => void;
}

export interface RouteResult {
  distance: number;
  duration: number;
  fuelCost: number;
  tollCost: number;
  parkingCost: number;
  publicTransportCost: number;
  totalCost: number;
  travelMode: string;
  geometry?: any;
}

const travelModes = [
  { id: 'driving', label: 'Drive', icon: Car, color: 'blue' },
  { id: 'transit', label: 'Transit', icon: Train, color: 'green' },
  { id: 'cycling', label: 'Cycle', icon: Bike, color: 'purple' },
  { id: 'walking', label: 'Walk', icon: Footprints, color: 'orange' }
];

// Australian suburbs with coordinates
const AUSTRALIAN_SUBURBS = [
  { name: 'Sydney CBD', state: 'NSW', lat: -33.8688, lng: 151.2093 },
  { name: 'Parramatta', state: 'NSW', lat: -33.8150, lng: 151.0000 },
  { name: 'Bondi', state: 'NSW', lat: -33.8915, lng: 151.2767 },
  { name: 'Chatswood', state: 'NSW', lat: -33.7969, lng: 151.1832 },
  { name: 'Melbourne CBD', state: 'VIC', lat: -37.8136, lng: 144.9631 },
  { name: 'Richmond', state: 'VIC', lat: -37.8197, lng: 144.9989 },
  { name: 'St Kilda', state: 'VIC', lat: -37.8679, lng: 144.9811 },
  { name: 'Brunswick', state: 'VIC', lat: -37.7667, lng: 144.9600 },
  { name: 'Brisbane CBD', state: 'QLD', lat: -27.4698, lng: 153.0251 },
  { name: 'Fortitude Valley', state: 'QLD', lat: -27.4572, lng: 153.0355 },
  { name: 'South Bank', state: 'QLD', lat: -27.4766, lng: 153.0202 },
  { name: 'New Farm', state: 'QLD', lat: -27.4667, lng: 153.0500 },
  { name: 'Perth CBD', state: 'WA', lat: -31.9505, lng: 115.8605 },
  { name: 'Fremantle', state: 'WA', lat: -32.0569, lng: 115.7439 },
  { name: 'Subiaco', state: 'WA', lat: -31.9474, lng: 115.8248 },
  { name: 'Adelaide CBD', state: 'SA', lat: -34.9285, lng: 138.6007 },
  { name: 'Glenelg', state: 'SA', lat: -34.9804, lng: 138.5129 },
  { name: 'Hobart CBD', state: 'TAS', lat: -42.8821, lng: 147.3272 },
  { name: 'Canberra City', state: 'ACT', lat: -35.2809, lng: 149.1300 },
  { name: 'Darwin City', state: 'NT', lat: -12.4634, lng: 130.8456 }
];

export default function RouteCalculator({ origin, destination, onRouteCalculated, onOriginChange }: RouteCalculatorProps) {
  const [selectedMode, setSelectedMode] = useState('driving');
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuburb, setSelectedSuburb] = useState<string>('');
  const [showSuburbSelector, setShowSuburbSelector] = useState(!origin);

  // Auto-calculate when both points are set
  useEffect(() => {
    if (origin && destination && !isCalculating) {
      calculateRoute();
    }
  }, [origin, destination]);

  const handleSuburbSelect = (suburb: typeof AUSTRALIAN_SUBURBS[0]) => {
    const newOrigin = {
      latitude: suburb.lat,
      longitude: suburb.lng,
      address: `${suburb.name}, ${suburb.state}`
    };
    setSelectedSuburb(`${suburb.name}, ${suburb.state}`);
    setShowSuburbSelector(false);
    if (onOriginChange) {
      onOriginChange(newOrigin);
    }
  };

  const calculateRoute = async () => {
    if (!origin || !destination) {
      setError('Please select your location and a business to calculate route');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const response = await fetch(`https://opulent-capybara-97gqpjqr69939pqw-5007.app.github.dev/api/map/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: {
            latitude: origin.latitude,
            longitude: origin.longitude
          },
          destination: {
            latitude: destination.latitude,
            longitude: destination.longitude
          },
          travelMode: selectedMode
        })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate route');
      }

      const data = await response.json();
      setResult(data);
      onRouteCalculated(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate route');
    } finally {
      setIsCalculating(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Navigation className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Route Calculator</h3>
        </div>
        {origin && (
          <button
            onClick={() => setShowSuburbSelector(true)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Change Location
          </button>
        )}
      </div>

      {/* Suburb Selector */}
      {showSuburbSelector && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Select Your Location
            </label>
            {origin && (
              <button
                onClick={() => setShowSuburbSelector(false)}
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            {AUSTRALIAN_SUBURBS.map((suburb) => (
              <button
                key={`${suburb.name}-${suburb.state}`}
                onClick={() => handleSuburbSelect(suburb)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{suburb.name}</span>
                  <span className="text-xs text-gray-500">{suburb.state}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Select the suburb where you live or want to live
          </p>
        </div>
      )}

      {/* Travel Mode Selection */}
      {!showSuburbSelector && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Travel Mode
          </label>
        <div className="grid grid-cols-4 gap-2">
          {travelModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? `border-${mode.color}-500 bg-${mode.color}-50`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Icon className={`w-6 h-6 mb-1 ${
                  isSelected ? `text-${mode.color}-600` : 'text-gray-600'
                }`} />
                <span className={`text-xs font-medium ${
                  isSelected ? `text-${mode.color}-700` : 'text-gray-700'
                }`}>
                  {mode.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Location Summary */}
      {!showSuburbSelector && (
      <div className="space-y-2 text-sm">
        <div className="flex items-start space-x-2 bg-green-50 p-3 rounded-lg">
          <Home className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-green-700 font-medium mb-1">Your Location (Point A)</p>
            <p className="font-semibold text-gray-900">
              {origin?.address || (origin ? `${origin.latitude.toFixed(4)}, ${origin.longitude.toFixed(4)}` : 'Not selected')}
            </p>
            {!origin && (
              <p className="text-xs text-gray-600 mt-1">👆 Select a suburb above</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center">
          <Navigation className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex items-start space-x-2 bg-red-50 p-3 rounded-lg">
          <Building2 className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-red-700 font-medium mb-1">Business Location (Point B)</p>
            <p className="font-semibold text-gray-900">
              {destination?.name || destination?.address || (destination ? `${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}` : 'Not selected')}
            </p>
            {!destination && (
              <p className="text-xs text-gray-600 mt-1">👆 Click a business marker on the map</p>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Calculate Button */}
      {!showSuburbSelector && (
      <button
        onClick={calculateRoute}
        disabled={!origin || !destination || isCalculating}
        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
      >
        {isCalculating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Calculating...</span>
          </>
        ) : (
          <>
            <Navigation className="w-5 h-5" />
            <span>Calculate Route</span>
          </>
        )}
      </button>
      )}

      {/* Error Message */}
      {!showSuburbSelector && error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {!showSuburbSelector && result && (
        <div className="space-y-3 pt-3 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900">Trip Summary</h4>
          
          {/* Distance & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700 font-medium">Distance</span>
              </div>
              <p className="text-xl font-bold text-blue-900">{result.distance.toFixed(1)} km</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-700 font-medium">Duration</span>
              </div>
              <p className="text-xl font-bold text-purple-900">{formatDuration(result.duration)}</p>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-green-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 font-semibold">Cost Breakdown</span>
            </div>
            
            <div className="space-y-1 text-sm">
              {result.fuelCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Fuel</span>
                  <span className="font-medium text-gray-900">{formatCurrency(result.fuelCost)}</span>
                </div>
              )}
              {result.tollCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Tolls</span>
                  <span className="font-medium text-gray-900">{formatCurrency(result.tollCost)}</span>
                </div>
              )}
              {result.parkingCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Parking (daily)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(result.parkingCost)}</span>
                </div>
              )}
              {result.publicTransportCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Public Transport</span>
                  <span className="font-medium text-gray-900">{formatCurrency(result.publicTransportCost)}</span>
                </div>
              )}
              
              <div className="flex justify-between pt-2 border-t border-green-200">
                <span className="font-semibold text-green-800">Total Trip Cost</span>
                <span className="font-bold text-green-900 text-lg">{formatCurrency(result.totalCost)}</span>
              </div>
            </div>
          </div>

          {/* Daily/Weekly/Monthly Estimates */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 font-medium mb-2">Commute Estimates</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-gray-600">Daily (2x)</p>
                <p className="font-semibold text-gray-900">{formatCurrency(result.totalCost * 2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Weekly</p>
                <p className="font-semibold text-gray-900">{formatCurrency(result.totalCost * 2 * 5)}</p>
              </div>
              <div>
                <p className="text-gray-600">Monthly</p>
                <p className="font-semibold text-gray-900">{formatCurrency(result.totalCost * 2 * 5 * 4)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
