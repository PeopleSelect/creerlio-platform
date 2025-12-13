'use client';

import React, { useState } from 'react';
import { Coffee, Dumbbell, Baby, ShoppingCart, Cross, UtensilsCrossed, Stethoscope, MapPin, Star, Phone, Navigation } from 'lucide-react';

interface Amenity {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distance: number;
  rating: number;
  address: string;
  phone?: string;
  openNow: boolean;
}

interface NearbyAmenitiesProps {
  latitude: number;
  longitude: number;
  apiBaseUrl: string;
  onAmenitySelect?: (amenity: Amenity) => void;
}

const CATEGORIES = [
  { value: 'cafe', label: 'Cafes', icon: Coffee },
  { value: 'gym', label: 'Gyms', icon: Dumbbell },
  { value: 'childcare', label: 'Childcare', icon: Baby },
  { value: 'supermarket', label: 'Supermarkets', icon: ShoppingCart },
  { value: 'pharmacy', label: 'Pharmacies', icon: Cross },
  { value: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed },
  { value: 'medical', label: 'Medical', icon: Stethoscope },
];

const RADIUS_OPTIONS = [
  { value: 500, label: '0.5 km' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
  { value: 5000, label: '5 km' },
  { value: 10000, label: '10 km' },
];

export default function NearbyAmenities({ latitude, longitude, apiBaseUrl, onAmenitySelect }: NearbyAmenitiesProps) {
  const [selectedCategory, setSelectedCategory] = useState('cafe');
  const [radius, setRadius] = useState(1000);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchAmenities = async (category: string, searchRadius: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiBaseUrl}/api/map/amenities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          radius: searchRadius,
          category,
        }),
      });

      if (!response.ok) throw new Error('Failed to search amenities');
      
      const data = await response.json();
      setAmenities(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    searchAmenities(category, radius);
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    searchAmenities(selectedCategory, newRadius);
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    const Icon = cat?.icon || MapPin;
    return <Icon className="w-4 h-4" />;
  };

  const openInMaps = (amenity: Amenity) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${amenity.latitude},${amenity.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-3">Nearby Amenities</h3>
        
        {/* Category Selection */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-amber-50 border-amber-600 text-amber-900'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Radius Selection */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-medium text-gray-700">Search radius:</label>
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleRadiusChange(opt.value)}
                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                  radius === opt.value
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      ) : amenities.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No {selectedCategory}s found within {radius / 1000}km</p>
          <p className="text-sm">Try increasing the search radius.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {amenities.map((amenity) => (
            <div
              key={amenity.id}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onAmenitySelect?.(amenity)}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3 flex-1">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getCategoryIcon(amenity.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{amenity.name}</h4>
                      {amenity.openNow && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          Open
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm text-gray-600">{amenity.rating}</span>
                      <span className="text-sm text-gray-400 mx-2">•</span>
                      <span className="text-sm text-gray-600">{amenity.distance.toFixed(2)} km away</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{amenity.address}</p>
                    {amenity.phone && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                        <Phone className="w-3 h-3" />
                        {amenity.phone}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openInMaps(amenity);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Get directions"
                >
                  <Navigation className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {amenities.length > 0 && (
        <div className="text-sm text-gray-500 text-center pt-2 border-t">
          Found {amenities.length} {selectedCategory}(s) within {radius / 1000}km
        </div>
      )}
    </div>
  );
}
