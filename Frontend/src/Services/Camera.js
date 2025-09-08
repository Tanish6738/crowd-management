// CCTV / Camera Management API Service
// Mirrors patterns used in api.js & heatMapApi.js for consistency.
// Endpoints (per backend skeleton in app.py):
//  GET    /cctvs                              -> list all (optionally filtered via query params)
//  GET    /cctvs/{cctv_id}                    -> get single
//  POST   /cctvs                              -> create
//  PUT    /cctvs/{cctv_id}                    -> full update
//  PATCH  /cctvs/{cctv_id}/status             -> status only
//  DELETE /cctvs/{cctv_id}                    -> delete
//  GET    /cctvs/summary                      -> aggregated stats
//  GET    /cctvs/search                       -> search (q, status, area, zone ...)
//  GET    /cctvs/by-area/{area_name}
//  GET    /cctvs/by-zone/{zone_name}
//  GET    /cctvs/by-area-zone/{area}/{zone}
//  GET    /cctvs/by-status/{status}
//  GET    /cctvs/by-location-type/{type}
//  POST   /cctvs/bulk                         -> bulk create
//  PUT    /cctvs/bulk/status                  -> bulk status update { ids, status }
//  DELETE /cctvs/bulk                         -> bulk delete { ids }
// NOTE: Backend file shows placeholders; adjust request bodies here if backend differs once implemented.

import axios from 'axios';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
// Precedence: dedicated CCTV API env -> generic API -> HF space -> localhost
const BASE_URL = (
	'https://krish09bha-dhruvai2.hf.space'
) || 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Axios Instance
// ---------------------------------------------------------------------------
const client = axios.create({
	baseURL: BASE_URL,
	headers: { 'Accept': 'application/json' }
});

client.interceptors.response.use(r => r, e => Promise.reject(normalizeError(e)));

if (import.meta?.env?.MODE !== 'production') {
	client.interceptors.request.use(cfg => { console.debug('[cctvApi] →', cfg.method?.toUpperCase(), cfg.baseURL + cfg.url); return cfg; });
	client.interceptors.response.use(res => { console.debug('[cctvApi] ←', res.status, res.config.url); return res; });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Request De-duplication, Caching & 429 Backoff
// ---------------------------------------------------------------------------
const _cache = new Map(); // key -> { ts, data }
const _inFlight = new Map(); // key -> promise
const DEFAULT_TTL = 30_000; // 30s
const sleep = (ms) => new Promise(r=>setTimeout(r, ms));

function invalidateCache(matchPrefix) {
	if (!matchPrefix) return;
	for (const k of Array.from(_cache.keys())) {
		if (k.startsWith(matchPrefix)) _cache.delete(k);
	}
}

async function exec(promiseFactory, { dedupeKey, ttl = 0, force = false, maxRetries = 3 } = {}) {
	const key = dedupeKey;
	const now = Date.now();
	let staleEntry = null;
	if (key && _cache.has(key)) {
		staleEntry = _cache.get(key);
		if (!force && ttl > 0 && now - staleEntry.ts < ttl) {
			return staleEntry.data; // fresh
		}
	}
	if (!force && key && _inFlight.has(key)) {
		return _inFlight.get(key);
	}
	let attempt = 0;
	const run = async () => {
		try {
			const resp = await promiseFactory();
			if (ttl > 0 && key) _cache.set(key, { ts: Date.now(), data: resp.data });
			return resp.data;
		} catch (err) {
			if (err instanceof ApiError && err.status === 429) {
				// serve stale if available even if expired
				if (staleEntry) return staleEntry.data;
			}
			if (err instanceof ApiError && err.status === 429 && attempt < maxRetries) {
				attempt += 1;
				const delay = Math.min(2000, 150 * 2 ** attempt) + Math.random()*100;
				await sleep(delay);
				return run();
			}
			throw err;
		}
	};
	const prom = run().finally(()=> { if (key) _inFlight.delete(key); });
	if (key) _inFlight.set(key, prom);
	return prom;
}

// Map backend CCTV record to UI friendly shape (light normalization & safe defaults)
export const normalizeCCTV = (c = {}) => ({
	id: c.id || c._id || c.object_id || null,
	name: c.name || c.camera_name || 'Unnamed Camera',
	description: c.description || c.desc || '',
	area: c.area || c.area_name || null,
	zone: c.zone || c.zone_name || null,
	location_type: c.location_type || c.type || null,
	status: c.status || 'unknown',
	stream_url: c.stream_url || c.rtsp_url || c.http_url || null,
	last_online: c.last_online || c.updated_at || c.last_seen || null,
	created_at: c.created_at || c.timestamp || null,
	meta: c
});

// Convert arrays safely
const normalizeList = (arr) => Array.isArray(arr) ? arr.map(normalizeCCTV) : [];

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------
export const listCCTVs = (params = {}, config, { force=false, ttl=DEFAULT_TTL } = {}) => exec(() => client.get('/cctvs', { ...(config||{}), params }), { dedupeKey: 'cctvs:'+JSON.stringify(params||{}), ttl, force });
export const getCCTV = (id, config, { force=false, ttl=DEFAULT_TTL } = {}) => {
	if (!id) throw new ApiError('id required');
	return exec(() => client.get(`/cctvs/${encodeURIComponent(id)}`, config), { dedupeKey: 'cctv:'+id, ttl, force });
};
export const createCCTV = (payload, config) => {
	if (!payload) throw new ApiError('payload required');
	return exec(() => client.post('/cctvs', payload, config)).then(d => { invalidateCache('cctvs:'); invalidateCache('cctv_summary'); return d; });
};
export const updateCCTV = (id, payload, config) => {
	if (!id) throw new ApiError('id required');
	return exec(() => client.put(`/cctvs/${encodeURIComponent(id)}`, payload, config)).then(d => { invalidateCache('cctvs:'); invalidateCache('cctv:'+id); invalidateCache('cctv_summary'); return d; });
};
export const updateCCTVStatus = (id, status, config) => {
	if (!id) throw new ApiError('id required');
	if (!status) throw new ApiError('status required');
	return exec(() => client.patch(`/cctvs/${encodeURIComponent(id)}/status`, { status }, config)).then(d => { invalidateCache('cctvs:'); invalidateCache('cctv:'+id); invalidateCache('cctv_summary'); return d; });
};
export const deleteCCTV = (id, config) => {
	if (!id) throw new ApiError('id required');
	return exec(() => client.delete(`/cctvs/${encodeURIComponent(id)}`, config)).then(d => { invalidateCache('cctvs:'); invalidateCache('cctv:'+id); invalidateCache('cctv_summary'); return d; });
};

// ---------------------------------------------------------------------------
// Bulk Operations
// ---------------------------------------------------------------------------
export const bulkCreateCCTVs = (list = [], config) => {
	if (!Array.isArray(list) || !list.length) throw new ApiError('non-empty array required');
	return exec(() => client.post('/cctvs/bulk', list, config)).then(d => { invalidateCache('cctvs:'); invalidateCache('cctv_summary'); return d; });
};
export const bulkUpdateStatus = (ids = [], status, config) => {
	if (!Array.isArray(ids) || !ids.length) throw new ApiError('ids required');
	if (!status) throw new ApiError('status required');
	return exec(() => client.put('/cctvs/bulk/status', { ids, status }, config)).then(d => { invalidateCache('cctvs:'); invalidateCache('cctv_summary'); ids.forEach(id=>invalidateCache('cctv:'+id)); return d; });
};
export const bulkDeleteCCTVs = (ids = [], config) => {
	if (!Array.isArray(ids) || !ids.length) throw new ApiError('ids required');
	return exec(() => client.delete('/cctvs/bulk', { ...(config||{}), data: { ids } })).then(d => { invalidateCache('cctvs:'); invalidateCache('cctv_summary'); ids.forEach(id=>invalidateCache('cctv:'+id)); return d; });
};

// ---------------------------------------------------------------------------
// Specialized Queries / Filters
// ---------------------------------------------------------------------------
export const getSummary = (config, { force=false, ttl=DEFAULT_TTL } = {}) => exec(() => client.get('/cctvs/summary', config), { dedupeKey: 'cctv_summary', ttl, force });
export const searchCCTVs = (query = {}, config, { force=true } = {}) => { // search usually user-driven; bypass cache
	// query can be string or object
	if (typeof query === 'string') {
		return exec(() => client.get('/cctvs/search', { ...(config||{}), params: { q: query } }), { force });
	}
	return exec(() => client.get('/cctvs/search', { ...(config||{}), params: query }), { force });
};
export const listByArea = (areaName, config, { force=false, ttl=DEFAULT_TTL } = {}) => {
	if (!areaName) throw new ApiError('areaName required');
	return exec(() => client.get(`/cctvs/by-area/${encodeURIComponent(areaName)}`, config), { dedupeKey: 'area:'+areaName, ttl, force });
};
export const listByZone = (zoneName, config, { force=false, ttl=DEFAULT_TTL } = {}) => {
	if (!zoneName) throw new ApiError('zoneName required');
	return exec(() => client.get(`/cctvs/by-zone/${encodeURIComponent(zoneName)}`, config), { dedupeKey: 'zone:'+zoneName, ttl, force });
};
export const listByAreaZone = (areaName, zoneName, config, { force=false, ttl=DEFAULT_TTL } = {}) => {
	if (!areaName || !zoneName) throw new ApiError('areaName & zoneName required');
	return exec(() => client.get(`/cctvs/by-area-zone/${encodeURIComponent(areaName)}/${encodeURIComponent(zoneName)}`, config), { dedupeKey: 'area_zone:'+areaName+':'+zoneName, ttl, force });
};
export const listByStatus = (status, config, { force=false, ttl=DEFAULT_TTL } = {}) => {
	if (!status) throw new ApiError('status required');
	return exec(() => client.get(`/cctvs/by-status/${encodeURIComponent(status)}`, config), { dedupeKey: 'status:'+status, ttl, force });
};
export const listByLocationType = (locationType, config, { force=false, ttl=DEFAULT_TTL } = {}) => {
	if (!locationType) throw new ApiError('locationType required');
	return exec(() => client.get(`/cctvs/by-location-type/${encodeURIComponent(locationType)}`, config), { dedupeKey: 'locType:'+locationType, ttl, force });
};

// ---------------------------------------------------------------------------
// Convenience Aggregations / Helpers
// ---------------------------------------------------------------------------
export const fetchAndNormalizeAll = async (params = {}, config, opts) => {
	const data = await listCCTVs(params, config, opts);
	return normalizeList(data);
};

export const summarizeStatusCounts = (list = []) => {
	return list.reduce((acc, c) => {
		const s = (c.status || 'unknown').toLowerCase();
		acc[s] = (acc[s] || 0) + 1;
		acc.total = (acc.total || 0) + 1;
		return acc;
	}, { total: 0 });
};

// ---------------------------------------------------------------------------
// Export Namespace
// ---------------------------------------------------------------------------
export const cameraApi = {
	client,
	// CRUD
	listCCTVs,
	getCCTV,
	createCCTV,
	updateCCTV,
	updateCCTVStatus,
	deleteCCTV,
	// Bulk
	bulkCreateCCTVs,
	bulkUpdateStatus,
	bulkDeleteCCTVs,
	// Queries
	getSummary,
	searchCCTVs,
	listByArea,
	listByZone,
	listByAreaZone,
	listByStatus,
	listByLocationType,
	// Helpers
	normalizeCCTV,
	fetchAndNormalizeAll,
	summarizeStatusCounts
};

export default cameraApi;

// ---------------------------------------------------------------------------
// Example (remove in production):
// import { cameraApi } from '@/Services/Camera';
// const all = await cameraApi.fetchAndNormalizeAll();
// console.log(cameraApi.summarizeStatusCounts(all));
// ---------------------------------------------------------------------------
