# Mapping Setup Guide

This guide explains how to set up mapping features for the Creerlio Platform, including geocoding, route calculation, and map visualization.

## Overview

The Creerlio Platform supports multiple mapping providers:
- **Google Maps API** (Primary - Recommended)
- **Mapbox** (Alternative)
- **Nominatim/OpenStreetMap** (Fallback - Free but limited)

## Step 1: Choose a Mapping Provider

### Google Maps API (Recommended)

**Pros:**
- Most comprehensive features
- Excellent geocoding accuracy
- Detailed routing with multiple modes
- Real-time traffic data
- Street View integration

**Cons:**
- Requires billing account (free tier available)
- API key required

### Mapbox

**Pros:**
- Good customization options
- Competitive pricing
- Good documentation

**Cons:**
- Requires API key
- Different API structure

### Nominatim/OpenStreetMap (Free)

**Pros:**
- Completely free
- No API key required
- Good for basic geocoding

**Cons:**
- Rate limits (1 request per second)
- No routing API
- Less accurate than paid services

## Step 2: Get API Keys

### Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
   - Directions API
   - Distance Matrix API (optional)
4. Create credentials (API Key)
5. Restrict API key (recommended):
   - Application restrictions: HTTP referrers
   - API restrictions: Select only the APIs you need

### Mapbox

1. Sign up at [mapbox.com](https://www.mapbox.com)
2. Go to Account → Access Tokens
3. Create a new token
4. Set token scopes (read, write as needed)

## Step 3: Configure Environment Variables

Add your API keys to `.env`:

```bash
# Google Maps (Primary)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Mapbox (Alternative)
MAPBOX_API_KEY=your_mapbox_api_key_here
```

For Azure deployment, add to App Service settings or Key Vault (see [AZURE_SECRETS_SETUP.md](./AZURE_SECRETS_SETUP.md)).

## Step 4: Test Geocoding

Test the geocoding service:

```bash
# Using Python
python -c "
from app.mapping_service import MappingService
import asyncio

async def test():
    service = MappingService()
    result = await service.geocode_address('1600 Amphitheatre Parkway, Mountain View, CA')
    print(result)

asyncio.run(test())
```

Expected output:
```json
{
    "latitude": 37.4224764,
    "longitude": -122.0842499,
    "formatted_address": "1600 Amphitheatre Parkway, Mountain View, CA 94043, USA"
}
```

## Step 5: Test Route Calculation

Test route calculation:

```bash
python -c "
from app.mapping_service import MappingService
import asyncio

async def test():
    service = MappingService()
    result = await service.calculate_route(
        'San Francisco, CA',
        'Los Angeles, CA',
        mode='driving'
    )
    print(result)

asyncio.run(test())
```

## Step 6: Frontend Map Integration

### Install Leaflet (for React/Next.js)

```bash
cd frontend
npm install leaflet react-leaflet
npm install --save-dev @types/leaflet
```

### Create Map Component

Example component (`frontend/src/components/MapView.tsx`):

```typescript
'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export default function MapView({ lat, lng, businesses }: { lat: number; lng: number; businesses?: any[] }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={13}
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[lat, lng]}>
        <Popup>Your Location</Popup>
      </Marker>
      {businesses?.map((business, idx) => (
        <Marker key={idx} position={[business.latitude, business.longitude]}>
          <Popup>{business.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
```

### Using Google Maps (Alternative)

For Google Maps, use `@react-google-maps/api`:

```bash
npm install @react-google-maps/api
```

## Step 7: Geocode Business Locations

When creating or updating business profiles, automatically geocode addresses:

```python
# In your business creation endpoint
from app.mapping_service import MappingService

mapping_service = MappingService()

# Geocode address
location_data = await mapping_service.geocode_address(business.address)

# Update business with coordinates
business.latitude = location_data['latitude']
business.longitude = location_data['longitude']
business.location = location_data['formatted_address']
```

## Step 8: Find Nearby Businesses

Use the mapping service to find businesses within a radius:

```python
# Find businesses within 5km
nearby = await mapping_service.get_nearby_businesses(
    latitude=37.7749,
    longitude=-122.4194,
    radius_km=5.0,
    db=db
)
```

## Step 9: Calculate Routes

Calculate routes between locations:

```python
route = await mapping_service.calculate_route(
    origin="San Francisco, CA",
    destination="Los Angeles, CA",
    mode="driving"  # or "walking", "bicycling", "transit"
)

# Access route data
distance = route['distance']['text']  # "677.2 km"
duration = route['duration']['text']  # "6 hours 25 mins"
steps = route['steps']  # Detailed turn-by-turn directions
```

## API Rate Limits

### Google Maps API

- **Free Tier**: $200 credit/month
- **Geocoding**: $5 per 1,000 requests
- **Directions**: $5 per 1,000 requests
- **Maps JavaScript API**: $7 per 1,000 loads

Monitor usage in [Google Cloud Console](https://console.cloud.google.com)

### Mapbox

- **Free Tier**: 50,000 map loads/month
- **Geocoding**: Free for first 100,000/month
- **Directions**: $0.50 per 1,000 requests

### Nominatim (OpenStreetMap)

- **Rate Limit**: 1 request per second
- **Usage Policy**: Must provide user agent
- **No Cost**: Completely free

## Best Practices

1. **Cache Geocoding Results**: Store coordinates to avoid re-geocoding
2. **Batch Requests**: When possible, batch multiple geocoding requests
3. **Handle Errors**: Implement fallback to free services
4. **Monitor Usage**: Track API usage to avoid unexpected costs
5. **Use Appropriate Zoom Levels**: Don't load unnecessary map tiles
6. **Optimize Marker Clustering**: For maps with many markers

## Troubleshooting

### Geocoding Returns None

- Verify API key is correct
- Check address format
- Ensure API is enabled in Google Cloud Console
- Check rate limits

### Route Calculation Fails

- Verify both addresses can be geocoded
- Check if route mode is supported
- Ensure Directions API is enabled (Google Maps)

### Map Not Displaying

- Check API key restrictions (HTTP referrers)
- Verify Leaflet CSS is imported
- Check browser console for errors
- Ensure coordinates are valid (lat: -90 to 90, lng: -180 to 180)

## Cost Optimization

1. **Cache Results**: Store geocoded addresses in database
2. **Use Free Tier**: Start with Nominatim for development
3. **Set Budget Alerts**: Configure spending limits
4. **Optimize Requests**: Only geocode when address changes
5. **Use Static Maps**: For simple displays, use static map images

## Next Steps

- Review [MAP_FEATURES_WORKING.md](./MAP_FEATURES_WORKING.md) for feature details
- See [MAP_IMPLEMENTATION_COMPLETE.md](./MAP_IMPLEMENTATION_COMPLETE.md) for implementation status
- Configure map styling and customization
- Set up monitoring for API usage


