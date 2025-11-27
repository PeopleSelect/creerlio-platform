'use client';

import { useState } from 'react';
import { GraduationCap, MapPin, Clock, DollarSign, Star, ExternalLink, Filter } from 'lucide-react';

interface SchoolFinderProps {
  location: { latitude: number; longitude: number } | null;
  onSchoolsFound: (schools: SchoolResult[]) => void;
}

export interface SchoolResult {
  id: string;
  name: string;
  type: string;
  location: { latitude: number; longitude: number };
  distance: number;
  travelTimeDriving: number;
  travelTimePublicTransport: number;
  travelTimeWalking: number;
  rating: number;
  studentCount: number;
  isPublic: boolean;
  fees: string | null;
  website: string | null;
}

const radiusOptions = [1, 2, 5, 10, 20];
const schoolTypeOptions = ['All', 'Primary', 'Secondary', 'High School', 'Private', 'Public'];

export default function SchoolFinder({ location, onSchoolsFound }: SchoolFinderProps) {
  const [radius, setRadius] = useState(5);
  const [schoolType, setSchoolType] = useState('All');
  const [isSearching, setIsSearching] = useState(false);
  const [schools, setSchools] = useState<SchoolResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolResult | null>(null);

  const searchSchools = async () => {
    if (!location) {
      setError('Please set a location on the map');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`https://opulent-capybara-97gqpjqr69939pqw-5007.app.github.dev/api/map/schools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          radiusKm: radius,
          schoolType: schoolType === 'All' ? null : schoolType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to search schools');
      }

      const data = await response.json();
      setSchools(data);
      onSchoolsFound(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search schools');
    } finally {
      setIsSearching(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-3">
        <div className="flex items-center space-x-2">
          <GraduationCap className="w-5 h-5" />
          <h3 className="font-semibold">School Finder</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Controls */}
        <div className="space-y-3">
          {/* Radius Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Radius
            </label>
            <div className="flex space-x-2">
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                    radius === r
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* School Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Type
            </label>
            <select
              value={schoolType}
              onChange={(e) => setSchoolType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {schoolTypeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Location Display */}
          <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
            <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm">
              <p className="text-gray-600">Search Location</p>
              <p className="font-medium text-gray-900">
                {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Not set'}
              </p>
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={searchSchools}
            disabled={!location || isSearching}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Filter className="w-5 h-5" />
                <span>Find Schools</span>
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Results */}
        {schools.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Found {schools.length} Schools</h4>
              <span className="text-xs text-gray-500">within {radius}km</span>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
              {schools.map((school) => (
                <div
                  key={school.id}
                  onClick={() => setSelectedSchool(selectedSchool?.id === school.id ? null : school)}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedSchool?.id === school.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 bg-white'
                  }`}
                >
                  {/* School Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 text-sm">{school.name}</h5>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          school.isPublic
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {school.type}
                        </span>
                        {school.fees && (
                          <span className="text-xs text-gray-600">{school.fees}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-semibold text-gray-900">{school.rating}</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center space-x-4 text-xs text-gray-600 mb-2">
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{school.distance.toFixed(1)} km</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <GraduationCap className="w-3 h-3" />
                      <span>{school.studentCount} students</span>
                    </div>
                  </div>

                  {/* Travel Times - Expanded View */}
                  {selectedSchool?.id === school.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      <p className="text-xs font-medium text-gray-700 mb-2">Travel Times from Home</p>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-blue-50 rounded p-2">
                          <p className="text-gray-600 mb-1">🚗 Drive</p>
                          <p className="font-semibold text-gray-900">{formatTime(school.travelTimeDriving)}</p>
                        </div>
                        <div className="bg-green-50 rounded p-2">
                          <p className="text-gray-600 mb-1">🚌 Transit</p>
                          <p className="font-semibold text-gray-900">{formatTime(school.travelTimePublicTransport)}</p>
                        </div>
                        <div className="bg-orange-50 rounded p-2">
                          <p className="text-gray-600 mb-1">🚶 Walk</p>
                          <p className="font-semibold text-gray-900">{formatTime(school.travelTimeWalking)}</p>
                        </div>
                      </div>

                      {/* Daily Cost Estimate */}
                      <div className="bg-yellow-50 rounded p-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700">Est. Daily Transport Cost</span>
                          <span className="text-sm font-bold text-gray-900">
                            ${((school.travelTimePublicTransport / 60) * 4.50).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Website Link */}
                      {school.website && (
                        <a
                          href={school.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center space-x-2 w-full py-2 px-3 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Visit Website</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
