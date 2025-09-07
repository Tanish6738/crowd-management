# User Location & Map API Documentation

## Overview
This API provides endpoints for real-time user location tracking, heatmap data, and map facilities for mobile applications and web clients.

---

## 1. Get User Map Data

### Endpoint
```
GET /api/user-map-data
```

### Description
Retrieves all map markers/facilities data for displaying on user maps.

### Request
- **Method**: GET
- **Headers**: None required
- **Parameters**: None

### Response
```json
{
  "markers": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "type": "toilets",
      "name": "Public Restroom Block A",
      "lat": 28.6139,
      "lng": 77.2090,
      "description": "Clean public restrooms with wheelchair access",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "type": "food_distribution",
      "name": "Food Counter 1",
      "lat": 28.6145,
      "lng": 77.2095,
      "description": "Free meal distribution point",
      "created_at": "2024-01-15T11:00:00.000Z"
    }
  ],
  "total_markers": 2,
  "map_center": {
    "lat": 28.6139,
    "lng": 77.2090
  }
}
```

### Response Fields
- `markers`: Array of facility markers
  - `id`: Unique marker identifier
  - `type`: Facility type (toilets, food_distribution, hospitals, etc.)
  - `name`: Display name of the facility
  - `lat`: Latitude coordinate
  - `lng`: Longitude coordinate
  - `description`: Optional description
  - `created_at`: ISO timestamp of creation
- `total_markers`: Total number of markers
- `map_center`: Default map center coordinates

### Example Usage
```javascript
// Fetch map data
const response = await fetch('/api/user-map-data');
const mapData = await response.json();

// Display markers on map
mapData.markers.forEach(marker => {
  L.marker([marker.lat, marker.lng])
    .bindPopup(`<b>${marker.name}</b><br>${marker.description}`)
    .addTo(map);
});
```

---

## 2. Submit Location Update

### Endpoint
```
POST /api/location-update
```

### Description
Submits user's current location for real-time tracking and heatmap generation.

### Request
- **Method**: POST
- **Headers**: 
  - `Content-Type: application/json`

### Request Body
```json
{
  "user_id": "user_12345",
  "lat": 28.6139,
  "lng": 77.2090,
  "timestamp": "2024-01-15T12:30:00.000Z",
  "device_info": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)"
}
```

### Request Fields
- `user_id` (optional): User identifier (auto-generated if not provided)
- `lat` (required): Latitude coordinate
- `lng` (required): Longitude coordinate  
- `timestamp` (optional): ISO timestamp (current time if not provided)
- `device_info` (optional): Device/browser information

### Response
```json
{
  "message": "Location updated successfully",
  "id": "64f1a2b3c4d5e6f7g8h9i0j3",
  "timestamp": "2024-01-15T12:30:00.000Z"
}
```

### Response Fields
- `message`: Success message
- `id`: Unique location record ID
- `timestamp`: Processed timestamp

### Example Usage
```javascript
// Get user location and send to server
navigator.geolocation.getCurrentPosition(async (position) => {
  const locationData = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    timestamp: new Date().toISOString(),
    device_info: navigator.userAgent
  };

  const response = await fetch('/api/location-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(locationData)
  });

  const result = await response.json();
  console.log('Location updated:', result.message);
});
```

---

## 3. Get Heatmap Data

### Endpoint
```
GET /api/heatmap-data
```

### Description
Retrieves aggregated location data for generating user activity heatmaps.

### Request
- **Method**: GET
- **Headers**: None required

### Query Parameters
- `hours` (optional): Time range in hours (default: 24)
  - Example: `/api/heatmap-data?hours=12`

### Response
```json
{
  "heatmap_points": [
    {
      "lat": 28.6139,
      "lng": 77.2090,
      "intensity": 5
    },
    {
      "lat": 28.6145,
      "lng": 77.2095,
      "intensity": 3
    },
    {
      "lat": 28.6142,
      "lng": 77.2088,
      "intensity": 8
    }
  ],
  "total_points": 156,
  "time_range_hours": 24,
  "last_updated": "2024-01-15T12:30:00.000Z"
}
```

### Response Fields
- `heatmap_points`: Array of location clusters
  - `lat`: Latitude of cluster center
  - `lng`: Longitude of cluster center
  - `intensity`: Activity intensity (higher = more activity)
- `total_points`: Total raw location points processed
- `time_range_hours`: Time range used for data
- `last_updated`: When data was last processed

### Example Usage
```javascript
// Load heatmap data
const response = await fetch('/api/heatmap-data?hours=12');
const heatmapData = await response.json();

// Create heatmap layer
const heatPoints = heatmapData.heatmap_points.map(point => [
  point.lat, 
  point.lng, 
  point.intensity
]);

const heatmapLayer = L.heatLayer(heatPoints, {
  radius: 25,
  blur: 15,
  gradient: {
    0.4: 'blue',
    0.6: 'cyan', 
    0.7: 'lime',
    0.8: 'yellow',
    1.0: 'red'
  }
}).addTo(map);
```

---

## 4. Get User Location History

### Endpoint
```
GET /api/user-location-history/{user_id}
```

### Description
Retrieves location history for a specific user.

### Request
- **Method**: GET
- **Headers**: None required

### Path Parameters
- `user_id` (required): User identifier

### Query Parameters
- `hours` (optional): Time range in hours (default: 24)

### Response
```json
{
  "user_id": "user_12345",
  "total_points": 48,
  "time_range_hours": 24,
  "locations": [
    {
      "lat": 28.6139,
      "lng": 77.2090,
      "timestamp": "2024-01-15T12:30:00.000Z",
      "device_info": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      "accuracy": 5.0,
      "altitude": 210.5
    },
    {
      "lat": 28.6142,
      "lng": 77.2088,
      "timestamp": "2024-01-15T12:25:00.000Z",
      "device_info": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      "accuracy": 3.2,
      "altitude": 208.1
    }
  ],
  "last_updated": "2024-01-15T12:30:00.000Z"
}
```

### Example Usage
```javascript
// Get user's location history
const userId = 'user_12345';
const response = await fetch(`/api/user-location-history/${userId}?hours=6`);
const history = await response.json();

// Draw user's path on map
const coordinates = history.locations.map(loc => [loc.lat, loc.lng]);
const polyline = L.polyline(coordinates, {color: 'blue'}).addTo(map);
map.fitBounds(polyline.getBounds());
```

---

## 5. Clear Location Data (Admin)

### Endpoint
```
DELETE /api/location-data
```

### Description
Clears old location data (removes data older than 7 days).

### Request
- **Method**: DELETE
- **Headers**: None required

### Response
```json
{
  "message": "Cleared 1250 old location records",
  "cleared_before": "2024-01-08T12:30:00.000Z"
}
```

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

### 404 Not Found
```json
{
  "detail": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Error getting heatmap data: Database connection failed"
}
```

---

## Rate Limiting & Best Practices

### Location Updates
- **Recommended frequency**: Every 30-60 seconds for active tracking
- **Battery optimization**: Use `maximumAge` and `timeout` in geolocation options
- **Accuracy**: Include GPS accuracy in device_info when available

### Heatmap Data
- **Caching**: Data is clustered and cached for performance
- **Update frequency**: Refresh every 5-10 minutes for real-time apps
- **Zoom levels**: Adjust heatmap radius based on map zoom level

### Map Data
- **Caching**: Cache marker data locally and refresh periodically
- **Filtering**: Filter markers by type based on user preferences
- **Offline**: Store essential markers for offline functionality

---

## Integration Examples

### Mobile App (React Native)
```javascript
import Geolocation from '@react-native-geolocation-service';

// Start location tracking
const startTracking = () => {
  const watchId = Geolocation.watchPosition(
    async (position) => {
      await fetch('https://api.example.com/api/location-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString()
        })
      });
    },
    (error) => console.error(error),
    { 
      enableHighAccuracy: true, 
      distanceFilter: 10,
      interval: 30000 
    }
  );
};
```

### Web App (JavaScript)
```javascript
// Real-time location sharing
class LocationTracker {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.isTracking = false;
    this.interval = null;
  }

  async startTracking() {
    if (!navigator.geolocation) return false;
    
    this.isTracking = true;
    this.sendLocation(); // Send immediately
    
    // Send every 30 seconds
    this.interval = setInterval(() => {
      this.sendLocation();
    }, 30000);
    
    return true;
  }

  async sendLocation() {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await fetch(`${this.apiBase}/api/location-update`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                timestamp: new Date().toISOString(),
                device_info: navigator.userAgent
              })
            });
            resolve(true);
          } catch (error) {
            console.error('Location update failed:', error);
            resolve(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }

  stopTracking() {
    this.isTracking = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Usage
const tracker = new LocationTracker('https://api.example.com');
tracker.startTracking();
```