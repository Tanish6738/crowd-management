// Heat Map & Location Tracking API Service
// Endpoints (per Backend/HeatMap.md):
//  GET    /api/user-map-data
//  POST   /api/location-update
//  GET    /api/heatmap-data?hours=H
//  GET    /api/user-location-history/{user_id}?hours=H
//  DELETE /api/location-data
// Environment base precedence: VITE_HEATMAP_API_URL -> VITE_API_URL -> hardcoded HF space -> localhost

import axios from 'axios';

const BASE_URL = (
  import.meta?.env?.VITE_HEATMAP_API_URL ||
  import.meta?.env?.VITE_API_URL ||
  'https://krish09bha-dhruvai2.hf.space'
) || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, { status, data, cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status ?? null;
    this.data = data;
    this.cause = cause;
  }
}

const normalizeError = (err) => {
  if (err instanceof ApiError) return err;
  if (err?.response) {
    return new ApiError(
      err.response?.data?.detail || err.response?.statusText || 'Request failed',
      { status: err.response.status, data: err.response.data, cause: err }
    );
  }
  if (err?.request) {
    return new ApiError('No response from server', { cause: err });
  }
  return new ApiError(err?.message || 'Unexpected error', { cause: err });
};

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Accept': 'application/json' }
});

client.interceptors.response.use(r => r, e => Promise.reject(normalizeError(e)));

if (import.meta?.env?.MODE !== 'production') {
  client.interceptors.request.use(cfg => { console.debug('[heatMapApi] →', cfg.method?.toUpperCase(), cfg.baseURL + cfg.url); return cfg; });
  client.interceptors.response.use(res => { console.debug('[heatMapApi] ←', res.status, res.config.url); return res; });
}

const exec = async (p) => { try { const r = await p; return r.data; } catch (e) { throw e; } };

export const getUserMapData = (config) => exec(client.get('/api/user-map-data', config));

export const sendLocationUpdate = (payload, config) => {
  if (!payload || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
    throw new ApiError('lat & lng required');
  }
  const body = {
    user_id: payload.user_id || payload.userId || undefined,
    lat: payload.lat,
    lng: payload.lng,
    timestamp: payload.timestamp || new Date().toISOString(),
    device_info: payload.device_info || payload.deviceInfo || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined)
  };
  return exec(client.post('/api/location-update', body, config));
};

export const updateUserLocation = sendLocationUpdate; // alias

export const getHeatmapData = (hours = 24, config) => exec(client.get('/api/heatmap-data', { ...(config||{}), params: { hours } }));

export const getUserLocationHistory = (userId, hours = 24, config) => {
  if (!userId) throw new ApiError('userId required');
  return exec(client.get(`/api/user-location-history/${encodeURIComponent(userId)}`, { ...(config||{}), params: { hours } }));
};

export const clearLocationData = (config) => exec(client.delete('/api/location-data', config));

export const sendBatchLocations = async (arr = []) => {
  if (!Array.isArray(arr) || !arr.length) return [];
  const results = [];
  for (const entry of arr) {
    try { results.push(await sendLocationUpdate(entry)); } catch (e) { results.push({ error: e.message }); }
  }
  return results;
};

export const heatMapApi = {
  client,
  getUserMapData,
  sendLocationUpdate,
  updateUserLocation,
  getHeatmapData,
  getUserLocationHistory,
  clearLocationData,
  sendBatchLocations,
  // --- Map Editor (Markers / Areas / Zones) ---
  // Markers
  async createMarker(payload, config) { return exec(client.post('/create_marker', payload, config)); },
  async listMarkers(config) { return exec(client.get('/view', config)); },
  async deleteMarker(id, config) { return exec(client.delete(`/markers/${encodeURIComponent(id)}`, config)); },
  // Areas
  async createArea(payload, config) { return exec(client.post('/areas', payload, config)); },
  async listAreas(config) { return exec(client.get('/areas', config)); },
  async updateArea(id, payload, config) { return exec(client.put(`/areas/${encodeURIComponent(id)}`, payload, config)); },
  async deleteArea(id, config) { return exec(client.delete(`/areas/${encodeURIComponent(id)}`, config)); },
  // Zones
  async createZone(payload, config) { return exec(client.post('/zones', payload, config)); },
  async listZones(config) { return exec(client.get('/zones', config)); },
  async listZonesByArea(areaId, config) { return exec(client.get(`/zones/by-area/${encodeURIComponent(areaId)}`, config)); },
  async updateZone(id, payload, config) { return exec(client.put(`/zones/${encodeURIComponent(id)}`, payload, config)); },
  async deleteZone(id, config) { return exec(client.delete(`/zones/${encodeURIComponent(id)}`, config)); }
};

export default heatMapApi;
