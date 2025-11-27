'use client';

import { useState } from 'react';
import { Home, DollarSign, Bed, Bath, Car, MapPin, ExternalLink, TrendingUp } from 'lucide-react';
import { AUSTRALIAN_STATES, AUSTRALIAN_CITIES, getCitiesByState } from '@/lib/enums';

interface PropertySearchProps {
  onPropertiesFound: (properties: PropertyResult[], medianPrices: Record<string, number>) => void;
}

export interface PropertyResult {
  id: string;
  address: string;
  suburb: string;
  state: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  price: number;
  priceText: string;
  description: string;
  image: string;
  listingUrl: string;
}

export interface RealEstateAgent {
  name: string;
  phone: string;
  website: string;
  specialty: string;
}

const propertyTypes = [
  { id: 'rent', label: 'Rent', icon: '🏠' },
  { id: 'sale', label: 'Buy', icon: '💰' }
];

const bedroomOptions = [
  { value: null, label: 'Any' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4+' }
];

export default function PropertySearch({ onPropertiesFound }: PropertySearchProps) {
  const [propertyType, setPropertyType] = useState('rent');
  const [suburb, setSuburb] = useState('');
  const [state, setState] = useState('NSW');
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [properties, setProperties] = useState<PropertyResult[]>([]);
  const [medianPrices, setMedianPrices] = useState<Record<string, number>>({});
  const [agents, setAgents] = useState<RealEstateAgent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchProperties = async () => {
    if (!suburb.trim()) {
      setError('Please enter a suburb');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`https://opulent-capybara-97gqpjqr69939pqw-5007.app.github.dev/api/map/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suburb: suburb,
          state: state,
          propertyType: propertyType,
          bedrooms: bedrooms
        })
      });

      if (!response.ok) {
        throw new Error('Failed to search properties');
      }

      const data = await response.json();
      setProperties(data.properties);
      setMedianPrices(data.medianPrices);
      setAgents(data.agents);
      onPropertiesFound(data.properties, data.medianPrices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search properties');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-3">
        <div className="flex items-center space-x-2">
          <Home className="w-5 h-5" />
          <h3 className="font-semibold">Property Search</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Controls */}
        <div className="space-y-3">
          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {propertyTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setPropertyType(type.id)}
                  className={`py-2 px-4 text-sm font-medium rounded-lg border-2 transition-colors flex items-center justify-center space-x-2 ${
                    propertyType === type.id
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Suburb
              </label>
              <input
                type="text"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                placeholder="e.g. Sydney, Melbourne..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {AUSTRALIAN_STATES.map((s) => (
                  <option key={s.value} value={s.value}>{s.abbr}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bedrooms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bedrooms
            </label>
            <div className="flex space-x-2">
              {bedroomOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setBedrooms(option.value)}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border-2 transition-colors ${
                    bedrooms === option.value
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={searchProperties}
            disabled={!suburb.trim() || isSearching}
            className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Home className="w-5 h-5" />
                <span>Search Properties</span>
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

        {/* Median Prices */}
        {Object.keys(medianPrices).length > 0 && (
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-blue-900 text-sm">Median Prices in {suburb}</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(medianPrices).map(([beds, price]) => (
                <div key={beds} className="bg-white rounded p-2">
                  <p className="text-xs text-gray-600">{beds}</p>
                  <p className="font-bold text-gray-900">
                    ${price.toLocaleString()}{propertyType === 'rent' ? '/wk' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {properties.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Found {properties.length} Properties</h4>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white rounded-lg border-2 border-gray-200 hover:border-orange-300 transition-all overflow-hidden"
                >
                  {/* Property Image */}
                  <div className="relative h-40 bg-gray-200">
                    <img
                      src={property.image}
                      alt={property.address}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800';
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {property.priceText}
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="p-3 space-y-2">
                    <div>
                      <h5 className="font-semibold text-gray-900">{property.address}</h5>
                      <p className="text-sm text-gray-600">{property.suburb}, {property.state}</p>
                    </div>

                    {/* Features */}
                    <div className="flex items-center space-x-4 text-sm text-gray-700">
                      <div className="flex items-center space-x-1">
                        <Bed className="w-4 h-4" />
                        <span>{property.bedrooms}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Bath className="w-4 h-4" />
                        <span>{property.bathrooms}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Car className="w-4 h-4" />
                        <span>{property.parking}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {property.description}
                    </p>

                    {/* View Listing Button */}
                    <a
                      href={property.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center space-x-2 w-full py-2 px-3 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700 transition-colors"
                    >
                      <span>View Full Listing</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real Estate Agents */}
        {agents.length > 0 && (
          <div className="pt-3 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Local Real Estate Agents</h4>
            <div className="space-y-2">
              {agents.map((agent, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-semibold text-gray-900">{agent.name}</h5>
                    <a
                      href={agent.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-xs text-gray-600">{agent.specialty}</p>
                  <p className="text-xs text-gray-700 font-medium mt-1">{agent.phone}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
