// Mapbox utilities for geocoding, routing, and location services
// Using Mapbox API (more affordable than Google Maps)

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiY3JlZXJsaW8iLCJhIjoiY2x6ZDEyMzQ1Njc4OXBxcGFiY2RlZmdoaSJ9.demo_token';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  address: string;
  city: string;
  state: string;
  postcode: string;
  coordinates: Coordinates;
}

export interface RouteInfo {
  duration: number; // minutes
  distance: number; // kilometers
  mode: 'driving' | 'walking' | 'cycling' | 'transit';
  tollCost?: number;
  steps?: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

/**
 * Geocode address to coordinates using Mapbox Geocoding API
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&country=AU&limit=1`
    );
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [longitude, latitude] = feature.center;
      
      // Extract address components
      const context = feature.context || [];
      const city = context.find((c: any) => c.id.includes('place'))?.text || '';
      const state = context.find((c: any) => c.id.includes('region'))?.text || '';
      const postcode = context.find((c: any) => c.id.includes('postcode'))?.text || '';
      
      return {
        address: feature.place_name,
        city,
        state,
        postcode,
        coordinates: { latitude, longitude }
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`
    );
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }
    
    return 'Unknown location';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Unknown location';
  }
}

/**
 * Calculate route between two points using Mapbox Directions API
 */
export async function calculateRoute(
  from: Coordinates,
  to: Coordinates,
  mode: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<RouteInfo | null> {
  try {
    const profile = mode === 'driving' ? 'driving-traffic' : mode;
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?access_token=${MAPBOX_TOKEN}&geometries=geojson&steps=true&overview=full`
    );
    
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const durationMinutes = Math.round(route.duration / 60);
      const distanceKm = (route.distance / 1000).toFixed(1);
      
      // Extract turn-by-turn steps
      const steps: RouteStep[] = route.legs[0].steps.map((step: any) => ({
        instruction: step.maneuver.instruction,
        distance: step.distance / 1000,
        duration: Math.round(step.duration / 60)
      }));
      
      // Estimate toll costs for Sydney (basic estimation)
      const tollCost = mode === 'driving' ? estimateTollCosts(from, to, parseFloat(distanceKm)) : undefined;
      
      return {
        duration: durationMinutes,
        distance: parseFloat(distanceKm),
        mode,
        tollCost,
        steps
      };
    }
    
    return null;
  } catch (error) {
    console.error('Route calculation error:', error);
    return null;
  }
}

/**
 * Estimate toll costs for Australian roads (Sydney focus)
 */
function estimateTollCosts(from: Coordinates, to: Coordinates, distanceKm: number): number {
  // Simplified toll estimation based on Sydney toll roads
  // In production, integrate with Linkt/E-TAG APIs
  
  const sydneyBounds = {
    minLat: -34.1, maxLat: -33.5,
    minLng: 150.5, maxLng: 151.5
  };
  
  const inSydney = 
    from.latitude >= sydneyBounds.minLat && from.latitude <= sydneyBounds.maxLat &&
    from.longitude >= sydneyBounds.minLng && from.longitude <= sydneyBounds.maxLng;
  
  if (!inSydney) return 0;
  
  // Average Sydney toll: $4-8 per crossing, estimate based on distance
  if (distanceKm > 30) return 12; // Multiple toll roads
  if (distanceKm > 15) return 8;  // Likely one toll road
  if (distanceKm > 5) return 4;   // Possible toll road
  
  return 0;
}

/**
 * Search for places near a location (schools, amenities, etc.)
 */
export async function searchNearby(
  coordinates: Coordinates,
  category: string,
  radius: number = 5000 // meters
): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${category}.json?proximity=${coordinates.longitude},${coordinates.latitude}&access_token=${MAPBOX_TOKEN}&limit=10`
    );
    
    const data = await response.json();
    
    return data.features.map((feature: any) => ({
      name: feature.text,
      address: feature.place_name,
      coordinates: {
        latitude: feature.center[1],
        longitude: feature.center[0]
      },
      category: feature.properties.category
    }));
  } catch (error) {
    console.error('Nearby search error:', error);
    return [];
  }
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get public transport directions (basic - in production use TripGo or NSW Transport API)
 */
export async function getPublicTransportRoute(
  from: Coordinates,
  to: Coordinates
): Promise<RouteInfo | null> {
  // For now, return walking route as placeholder
  // In production: integrate with Google Transit, TripGo, or state transport APIs
  const walkingRoute = await calculateRoute(from, to, 'walking');
  
  if (walkingRoute) {
    return {
      ...walkingRoute,
      mode: 'transit',
      duration: Math.round(walkingRoute.duration * 1.5), // Transit usually 1.5x walking time
      tollCost: 0 // Assume public transport Opal card cost
    };
  }
  
  return null;
}

/**
 * Mapbox static map image URL
 */
export function getStaticMapUrl(
  coordinates: Coordinates,
  width: number = 600,
  height: number = 400,
  zoom: number = 14
): string {
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+ff6b35(${coordinates.longitude},${coordinates.latitude})/${coordinates.longitude},${coordinates.latitude},${zoom}/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/**
 * Australian cities with coordinates (for autocomplete/defaults)
 */
export const MAJOR_AUSTRALIAN_CITIES = [
  { name: 'Sydney', state: 'NSW', coordinates: { latitude: -33.8688, longitude: 151.2093 } },
  { name: 'Melbourne', state: 'VIC', coordinates: { latitude: -37.8136, longitude: 144.9631 } },
  { name: 'Brisbane', state: 'QLD', coordinates: { latitude: -27.4698, longitude: 153.0251 } },
  { name: 'Perth', state: 'WA', coordinates: { latitude: -31.9505, longitude: 115.8605 } },
  { name: 'Adelaide', state: 'SA', coordinates: { latitude: -34.9285, longitude: 138.6007 } },
  { name: 'Canberra', state: 'ACT', coordinates: { latitude: -35.2809, longitude: 149.1300 } },
  { name: 'Hobart', state: 'TAS', coordinates: { latitude: -42.8821, longitude: 147.3272 } },
  { name: 'Darwin', state: 'NT', coordinates: { latitude: -12.4634, longitude: 130.8456 } }
];
