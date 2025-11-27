'use client';

import React, { useState } from 'react';
import { calculateRoute, geocodeAddress, formatDuration, formatDistance } from '@/lib/mapboxUtils';

interface CommuteResult {
  mode: 'driving' | 'walking' | 'cycling' | 'transit';
  duration: number; // minutes
  distance: number; // km
  tollCost?: number;
  steps: Array<{
    instruction: string;
    distance: number;
    duration: number;
  }>;
}

interface CommuteCalculatorProps {
  homeAddress?: string;
  workAddress?: string;
  onRouteCalculated?: (route: any) => void;
}

export default function CommuteCalculator({
  homeAddress: initialHome = '',
  workAddress: initialWork = '',
  onRouteCalculated
}: CommuteCalculatorProps) {
  const [homeAddress, setHomeAddress] = useState(initialHome);
  const [workAddress, setWorkAddress] = useState(initialWork);
  const [selectedMode, setSelectedMode] = useState<'driving' | 'walking' | 'cycling' | 'transit'>('driving');
  const [results, setResults] = useState<Record<string, CommuteResult>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDirections, setShowDirections] = useState(false);

  const modes = [
    { id: 'driving' as const, label: 'Drive', icon: '🚗' },
    { id: 'transit' as const, label: 'Transit', icon: '🚇' },
    { id: 'walking' as const, label: 'Walk', icon: '🚶' },
    { id: 'cycling' as const, label: 'Bike', icon: '🚴' }
  ];

  const calculateCommute = async () => {
    if (!homeAddress.trim() || !workAddress.trim()) {
      setError('Please enter both home and work addresses');
      return;
    }

    setIsCalculating(true);
    setError(null);
    setResults({});

    try {
      // Geocode addresses
      const [homeLocation, workLocation] = await Promise.all([
        geocodeAddress(homeAddress),
        geocodeAddress(workAddress)
      ]);

      if (!homeLocation || !workLocation) {
        setError('Could not find one or both addresses. Please check and try again.');
        return;
      }

      // Calculate routes for all modes
      const routePromises = modes.map(async (mode) => {
        try {
          const route = await calculateRoute(
            homeLocation.coordinates,
            workLocation.coordinates,
            mode.id === 'transit' ? 'driving' : mode.id as 'driving' | 'walking' | 'cycling'
          );

          if (route) {
            return {
              mode: mode.id,
              result: {
                mode: mode.id,
                duration: route.duration,
                distance: route.distance,
                tollCost: route.tollCost,
                steps: route.steps ? route.steps.map(step => ({
                  instruction: step.instruction || '',
                  distance: step.distance || 0,
                  duration: step.duration || 0
                }))
              }
            };
          }
          return null;
        } catch (error) {
          console.error(`Error calculating ${mode.id} route:`, error);
          return null;
        }
      });

      const routeResults = await Promise.all(routePromises);
      const newResults: Record<string, CommuteResult> = {};

      routeResults.forEach(result => {
        if (result) {
          newResults[result.mode] = result.result;
        }
      });

      setResults(newResults);

      // Call callback with selected mode route
      if (onRouteCalculated && newResults[selectedMode]) {
        onRouteCalculated(newResults[selectedMode]);
      }

      // Save to localStorage for later use
      localStorage.setItem('lastCommuteCalculation', JSON.stringify({
        homeAddress,
        workAddress,
        results: newResults,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Error calculating commute:', error);
      setError('An error occurred while calculating routes. Please try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const getCommuteScore = (duration: number, distance: number): { score: number; label: string; color: string } => {
    const speed = distance / (duration / 60); // km/h
    
    if (duration < 20) {
      return { score: 95, label: 'Excellent', color: 'text-green-600' };
    } else if (duration < 35) {
      return { score: 75, label: 'Good', color: 'text-blue-600' };
    } else if (duration < 50) {
      return { score: 55, label: 'Fair', color: 'text-amber-600' };
    } else {
      return { score: 30, label: 'Long', color: 'text-red-600' };
    }
  };

  const activeResult = results[selectedMode];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
        <h2 className="text-xl font-bold text-white">Commute Calculator</h2>
        <p className="text-amber-100 text-sm mt-1">Plan your journey to work</p>
      </div>

      {/* Input Section */}
      <div className="p-6 space-y-4 border-b border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🏠 Home Address
          </label>
          <input
            type="text"
            value={homeAddress}
            onChange={(e) => setHomeAddress(e.target.value)}
            placeholder="e.g., 123 Main St, Sydney NSW 2000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            💼 Work Address
          </label>
          <input
            type="text"
            value={workAddress}
            onChange={(e) => setWorkAddress(e.target.value)}
            placeholder="e.g., 456 George St, Sydney NSW 2000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={calculateCommute}
          disabled={isCalculating}
          className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCalculating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Calculating routes...
            </span>
          ) : (
            'Calculate Commute'
          )}
        </button>
      </div>

      {/* Results Section */}
      {Object.keys(results).length > 0 && (
        <>
          {/* Mode Selection */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-4 gap-2">
              {modes.map((mode) => {
                const result = results[mode.id];
                const isSelected = selectedMode === mode.id;
                
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setSelectedMode(mode.id);
                      if (onRouteCalculated && result) {
                        onRouteCalculated(result);
                      }
                    }}
                    disabled={!result}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50'
                        : result
                        ? 'border-gray-200 hover:border-gray-300 bg-white'
                        : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-2xl mb-1">{mode.icon}</div>
                    <div className="text-xs font-medium text-gray-900">{mode.label}</div>
                    {result && (
                      <div className="text-xs text-gray-600 mt-1">
                        {formatDuration(result.duration)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Result Details */}
          {activeResult && (
            <div className="p-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 font-medium mb-1">Duration</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatDuration(activeResult.duration)}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-600 font-medium mb-1">Distance</div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatDistance(activeResult.distance)}
                  </div>
                </div>
                {activeResult.tollCost && activeResult.tollCost > 0 && (
                  <div className="bg-amber-50 rounded-lg p-4">
                    <div className="text-sm text-amber-600 font-medium mb-1">Est. Tolls</div>
                    <div className="text-2xl font-bold text-amber-900">
                      ${activeResult.tollCost.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              {/* Commute Score */}
              {(() => {
                const score = getCommuteScore(activeResult.duration, activeResult.distance);
                return (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600">Commute Score</div>
                        <div className={`text-lg font-bold ${score.color}`}>
                          {score.label}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">{score.score}</div>
                        <div className="text-xs text-gray-500">out of 100</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Turn-by-turn Directions */}
              {activeResult.steps.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowDirections(!showDirections)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors mb-2"
                  >
                    <span className="font-medium text-gray-900">Turn-by-turn Directions</span>
                    <svg
                      className={`w-5 h-5 text-gray-600 transition-transform ${showDirections ? 'rotate-180' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {showDirections && (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {activeResult.steps.map((step, index) => (
                        <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">{step.instruction}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDistance(step.distance)} • {formatDuration(step.duration)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors">
                  Save Commute
                </button>
                <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors">
                  Share Route
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {Object.keys(results).length === 0 && !isCalculating && (
        <div className="p-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <p className="text-gray-500">Enter your addresses above to calculate commute times</p>
        </div>
      )}
    </div>
  );
}
