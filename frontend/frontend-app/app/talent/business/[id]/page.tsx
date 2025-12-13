'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MapPin, Briefcase, Users, Calendar, DollarSign, Home, Bus, TrendingUp } from 'lucide-react';
import { getApiBaseUrl, safeFetch } from '@/lib/api';

interface BusinessProfile {
  id: string;
  name: string;
  industry: string;
  businessSize: string;
  about: string;
  website: string;
  email: string;
  phone: string;
  location: {
    address: string;
    city: string;
    state: string;
    postcode: string;
    latitude: number;
    longitude: number;
  };
  openPositions: number;
  activelyHiring: boolean;
  founded: string;
  employeeCount: string;
  positions: Array<{
    id: string;
    title: string;
    type: string;
    salary: string;
    description: string;
  }>;
}

interface LocationIntelligence {
  housing: {
    medianHousePrice: string;
    medianRent: string;
    averageRent1Bed: string;
    averageRent2Bed: string;
    averageRent3Bed: string;
  };
  transport: {
    nearestStation: string;
    distanceToStation: string;
    weeklyTransportCost: string;
    parkingCost: string;
    routes: string[];
  };
  lifestyle: {
    populationDensity: string;
    schools: number;
    hospitals: number;
    shoppingCenters: number;
  };
}

export default function BusinessProfilePage() {
  const params = useParams();
  const businessId = params.id as string;
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [locationData, setLocationData] = useState<LocationIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'location'>('overview');

  useEffect(() => {
    fetchBusinessProfile();
    fetchLocationIntelligence();
  }, [businessId]);

  const fetchBusinessProfile = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const { data, error } = await safeFetch(`${apiBase}/api/business/profile/${businessId}`);
      
      if (error) {
        console.error('Error fetching business profile:', error);
      } else if (data) {
        setBusiness(data);
      }
    } catch (error) {
      console.error('Error fetching business profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationIntelligence = async () => {
    try {
      const apiBase = getApiBaseUrl();
      const { data, error } = await safeFetch(`${apiBase}/api/location/intelligence/${businessId}`);
      
      if (error) {
        console.error('Error fetching location intelligence:', error);
      } else if (data) {
        setLocationData(data);
      }
    } catch (error) {
      console.error('Error fetching location intelligence:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading business profile...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Business Not Found</h2>
          <p className="mt-2 text-gray-600">The business you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center">
                  <Briefcase className="w-4 h-4 mr-1" />
                  {business.industry}
                </span>
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {business.employeeCount}
                </span>
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {business.location.city}, {business.location.state}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Founded {business.founded}
                </span>
              </div>
              {business.activelyHiring && (
                <div className="mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    🟢 Actively Hiring - {business.openPositions} Open {business.openPositions === 1 ? 'Position' : 'Positions'}
                  </span>
                </div>
              )}
            </div>
            <button className="ml-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Connect with Business
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('positions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'positions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Open Positions ({business.openPositions})
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'location'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Location & Costs
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">About {business.name}</h2>
                <p className="text-gray-700 whitespace-pre-line">{business.about}</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Highlights</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600">Business Size</div>
                    <div className="text-lg font-semibold text-gray-900">{business.businessSize}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600">Industry</div>
                    <div className="text-lg font-semibold text-gray-900">{business.industry}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600">Employee Count</div>
                    <div className="text-lg font-semibold text-gray-900">{business.employeeCount}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-gray-600">Open Positions</div>
                    <div className="text-lg font-semibold text-gray-900">{business.openPositions}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600">Website</div>
                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {business.website}
                    </a>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Email</div>
                    <a href={`mailto:${business.email}`} className="text-blue-600 hover:underline">
                      {business.email}
                    </a>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Phone</div>
                    <a href={`tel:${business.phone}`} className="text-blue-600 hover:underline">
                      {business.phone}
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">{business.location.address}</p>
                  <p className="text-gray-700">
                    {business.location.city}, {business.location.state} {business.location.postcode}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('location')}
                  className="mt-4 w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm"
                >
                  View Map & Location Details
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'positions' && (
          <div className="space-y-4">
            {business.positions.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Open Positions</h3>
                <p className="text-gray-600">This business doesn't have any open positions at the moment.</p>
              </div>
            ) : (
              business.positions.map((position) => (
                <div key={position.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{position.title}</h3>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{position.type}</span>
                        {position.salary && (
                          <span className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {position.salary}
                          </span>
                        )}
                      </div>
                      <p className="mt-4 text-gray-700">{position.description}</p>
                    </div>
                    <button className="ml-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                      Apply Now
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'location' && locationData && (
          <div className="space-y-6">
            {/* Map */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="h-96 bg-gray-200 relative">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${business.location.latitude},${business.location.longitude}&zoom=14`}
                ></iframe>
                <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4">
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-red-600 mr-2" />
                    <div>
                      <div className="font-semibold text-gray-900">{business.name}</div>
                      <div className="text-sm text-gray-600">{business.location.address}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Housing Market */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Home className="w-6 h-6 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Housing Market</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Median House Price</span>
                    <span className="font-semibold text-gray-900">{locationData.housing.medianHousePrice}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Median Rent (Weekly)</span>
                    <span className="font-semibold text-gray-900">{locationData.housing.medianRent}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">1 Bedroom (Weekly)</span>
                    <span className="font-semibold text-gray-900">{locationData.housing.averageRent1Bed}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">2 Bedroom (Weekly)</span>
                    <span className="font-semibold text-gray-900">{locationData.housing.averageRent2Bed}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">3 Bedroom (Weekly)</span>
                    <span className="font-semibold text-gray-900">{locationData.housing.averageRent3Bed}</span>
                  </div>
                </div>
              </div>

              {/* Transport & Commute */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Bus className="w-6 h-6 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Transport & Commute</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Nearest Station</span>
                    <span className="font-semibold text-gray-900">{locationData.transport.nearestStation}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Distance to Station</span>
                    <span className="font-semibold text-gray-900">{locationData.transport.distanceToStation}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Weekly Transport Cost</span>
                    <span className="font-semibold text-gray-900">{locationData.transport.weeklyTransportCost}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Parking Cost (Daily)</span>
                    <span className="font-semibold text-gray-900">{locationData.transport.parkingCost}</span>
                  </div>
                  <div className="py-2">
                    <span className="text-gray-600 block mb-2">Available Routes:</span>
                    <div className="flex flex-wrap gap-2">
                      {locationData.transport.routes.map((route, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {route}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lifestyle & Amenities */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-6 h-6 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Lifestyle & Amenities</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Population Density</span>
                    <span className="font-semibold text-gray-900">{locationData.lifestyle.populationDensity}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Schools Nearby</span>
                    <span className="font-semibold text-gray-900">{locationData.lifestyle.schools}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Hospitals & Clinics</span>
                    <span className="font-semibold text-gray-900">{locationData.lifestyle.hospitals}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Shopping Centers</span>
                    <span className="font-semibold text-gray-900">{locationData.lifestyle.shoppingCenters}</span>
                  </div>
                </div>
              </div>

              {/* Cost Calculator */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <DollarSign className="w-6 h-6 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Estimated Monthly Costs</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Rent (2 Bedroom)</span>
                    <span className="font-semibold text-gray-900">
                      ${(parseFloat(locationData.housing.averageRent2Bed.replace(/[^0-9.]/g, '')) * 4.33).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Transport</span>
                    <span className="font-semibold text-gray-900">
                      ${(parseFloat(locationData.transport.weeklyTransportCost.replace(/[^0-9.]/g, '')) * 4.33).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Groceries (Est.)</span>
                    <span className="font-semibold text-gray-900">$800</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Utilities (Est.)</span>
                    <span className="font-semibold text-gray-900">$200</span>
                  </div>
                  <div className="flex justify-between items-center py-2 pt-2 border-t-2">
                    <span className="text-gray-900 font-semibold">Total Estimated Cost</span>
                    <span className="font-bold text-gray-900 text-lg">
                      ${(
                        parseFloat(locationData.housing.averageRent2Bed.replace(/[^0-9.]/g, '')) * 4.33 +
                        parseFloat(locationData.transport.weeklyTransportCost.replace(/[^0-9.]/g, '')) * 4.33 +
                        800 +
                        200
                      ).toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    💡 <strong>Tip:</strong> Consider these costs when evaluating job offers. A lower salary in a cheaper area might provide better quality of life than a higher salary in an expensive area.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
