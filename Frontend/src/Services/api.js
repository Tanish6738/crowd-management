// Centralized API service for Lost & Found system endpoints.
// Harmonized with API_DOCUMENTATION.md & COMPLETE_API_DOCUMENTATION.md
// Implemented Endpoints:
//  1.  POST /upload_found Volunteers a found person's details and photo
//  2.  POST /upload_lost Volunteers a lost person's details and photo
//  3.  GET  /search_face/{face_id} Views matches for a given face ID
//  4.  GET  /get_all_lost /List all lost persons
//  5.  GET  /get_all_found /List all found persons
//  6.  GET  /get_all_matches /List all match records
//  7.  GET  /health Health check
//  8.  GET  /stats Statistics summary
//  9.  GET  /check_matches/{face_id} Check matches for a given face ID
// 10.  POST /cleanup_found_duplicates?threshold=<float> Manual duplicate cleanup
// 11.  GET  /alert/{user_id} User alerts
// 12.  GET  /get_records_by_user/{user_id} Get records by user
// Backwards compatibility alias: createLostReport -> uploadLostPerson

import axios from 'axios';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = (import.meta?.env?.VITE_API_URL || 'https://krish09bha-dhruvai.hf.space') || 'http://localhost:8000';

// Default timeout (ms)

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
class ApiError extends Error {
	constructor(message, { status, data, cause } = {}) {
		super(message);
		this.name = 'ApiError';
		this.status = status ?? null;
		this.data = data;
		if (cause) this.cause = cause; // retain original error for debugging
	}
}

const normalizeError = (error) => {
	if (error instanceof ApiError) return error;
	if (error?.response) {
		const { status, data } = error.response;
		const message = data?.detail || data?.message || `Request failed with status ${status}`;
		return new ApiError(message, { status, data, cause: error });
	}
	if (error?.request) {
		return new ApiError('No response received from server', { cause: error });
	}
	return new ApiError(error?.message || 'Unexpected error', { cause: error });
};

// ---------------------------------------------------------------------------
// Axios Instance
// ---------------------------------------------------------------------------
const client = axios.create({
	baseURL: BASE_URL,
	headers: {
		'Accept': 'application/json'
	}
});

client.interceptors.response.use(
	(response) => response,
	(error) => Promise.reject(normalizeError(error))
);

// Optional request logging (disabled in production)
if (import.meta?.env?.MODE !== 'production') {
	client.interceptors.request.use((config) => {
		// eslint-disable-next-line no-console
		console.debug('[API] →', config.method?.toUpperCase(), config.url, config.params || '', config.data || '');
		return config;
	});
	client.interceptors.response.use((res) => {
		// eslint-disable-next-line no-console
		console.debug('[API] ←', res.status, res.config.url, res.data);
		return res;
	});
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Merge user supplied config with cancellation support.
 */
const withConfig = (config = {}) => ({ ...config });

/**
 * Wrap API calls to always return response.data and throw ApiError consistently.
 */
const exec = async (promise) => {
	try {
		const res = await promise;
		return res.data;
	} catch (err) {
		throw normalizeError(err);
	}
};

// ---------------------------------------------------------------------------
// Endpoint Functions
// ---------------------------------------------------------------------------
/**
 * 1. Upload Found Person (POST /upload_found)
 * @param {Object} payload - Found person data
 * @param {File|Blob} payload.file - Image file (required)
 * @returns {Promise<Object>} API response
 */
export const uploadFoundPerson = async (payload, config) => {
	if (!payload?.file) throw new ApiError('file is required for uploadFoundPerson');
	const formData = new FormData();

	const fields = [
		'name', 'gender', 'age', 'where_found', 'your_name', 'organization',
		'designation', 'user_id', 'mobile_no', 'email_id'
	];
	fields.forEach((k) => {
		if (payload[k] !== undefined && payload[k] !== null) {
			formData.append(k, String(payload[k]));
		}
	});
	formData.append('file', payload.file);

	return exec(client.post('/upload_found', formData, withConfig({
		...config,
		headers: { ...(config?.headers || {}), 'Content-Type': 'multipart/form-data' }
	})));
};

/**
 * 2. Upload Lost Person (POST /upload_lost)
 * @param {Object} payload - Lost person data (multipart/form-data)
 * @param {File|Blob} payload.file - Image file (required)
 * Required form fields (per spec):
 *  name, gender, age, where_lost, your_name, relation_with_lost,
 *  user_id, mobile_no, email_id, file
 * @returns {Promise<Object>} API response
 */
export const uploadLostPerson = async (payload, config) => {
	if (!payload?.file) throw new ApiError('file is required for uploadLostPerson');
	const required = ['name','gender','age','where_lost','your_name','relation_with_lost','user_id','mobile_no','email_id'];
	const missing = required.filter(f => payload[f] === undefined || payload[f] === null || payload[f] === '');
	if (missing.length) throw new ApiError(`Missing required fields for uploadLostPerson: ${missing.join(', ')}`);

	const formData = new FormData();
	required.forEach(k => formData.append(k, String(payload[k])));
	// Allow additional optional keys transparently (e.g., future extensions)
	Object.keys(payload).forEach(k => {
		if (!required.includes(k) && k !== 'file' && payload[k] !== undefined && payload[k] !== null) {
			formData.append(k, String(payload[k]));
		}
	});
	formData.append('file', payload.file);

	return exec(client.post('/upload_lost', formData, withConfig({
		...config,
		headers: { ...(config?.headers || {}), 'Content-Type': 'multipart/form-data' }
	})));
};

/**
 * 3. Search Face by ID (GET /search_face/{face_id})
 */
export const searchFace = async (faceId, config) => {
	if (!faceId) throw new ApiError('faceId is required for searchFace');
	// Treat 404 (face not found) as a valid, non-exceptional outcome so the UI can
	// display a friendly "not found" message instead of an error banner.
	try {
		return await exec(client.get(`/search_face/${encodeURIComponent(faceId)}`, withConfig(config)));
	} catch (err) {
		if (err.status === 404) {
			return {
				not_found: true,
				face_id: faceId,
				message: err.data?.detail || err.message || 'Face not found'
			};
		}
		throw err; // Re-throw other statuses (network issues, 500s, etc.)
	}
};

// ---------------------------------------------------------------------------
// Lightweight In‑Memory GET Cache (improves perceived speed & dedups double
// invocation caused by React 18 StrictMode in dev). NOT for sensitive data.
// Keys are endpoint paths. Each entry: { ts, ttl, data, promise }.
// Use config: { noCache: true } to bypass, or config: { cacheTTL: 0 }.
// ---------------------------------------------------------------------------
const _getCache = new Map();
const DEFAULT_CACHE_TTL = 30_000; // 30s – tweak via VITE_API_CACHE_TTL
const ENV_TTL = Number(import.meta?.env?.VITE_API_CACHE_TTL);
const EFFECTIVE_DEFAULT_TTL = !Number.isNaN(ENV_TTL) && ENV_TTL > 0 ? ENV_TTL : DEFAULT_CACHE_TTL;

const cachedGet = (path, config = {}) => {
	const noCache = config?.noCache === true;
	const ttl = config?.cacheTTL === 0 ? 0 : (config?.cacheTTL ?? EFFECTIVE_DEFAULT_TTL);
	const now = Date.now();
	if (!noCache && ttl > 0) {
		const entry = _getCache.get(path);
		if (entry) {
			// If in‑flight promise – return it (dedupe concurrent + StrictMode double calls)
			if (entry.promise) return entry.promise;
			if (now - entry.ts < entry.ttl) {
				return Promise.resolve(entry.data);
			}
			// stale -> fall through and refetch
		}
	}
	const p = exec(client.get(path, withConfig(config)))
		.then((data) => {
			if (!noCache && ttl > 0) {
				_getCache.set(path, { ts: Date.now(), ttl, data });
			}
			return data;
		})
		.catch((err) => {
			// On error, discard cache entry so future retries can proceed
			const existing = _getCache.get(path);
			if (existing?.promise) _getCache.delete(path);
			throw err;
		});
	if (!noCache && ttl > 0) {
		_getCache.set(path, { ts: now, ttl, data: undefined, promise: p });
	}
	return p;
};

/**
 * 4. Get All Lost People (GET /get_all_lost) – cached
 */
export const getAllLost = async (config) => cachedGet('/get_all_lost', config);

/**
 * 5. Get All Found People (GET /get_all_found) – cached
 */
export const getAllFound = async (config) => cachedGet('/get_all_found', config);

/**
 * 6. Get All Matches (GET /get_all_matches) – cached
 */
export const getAllMatches = async (config) => cachedGet('/get_all_matches', config);

/**
 * 7. Health Check (GET /health)
 * Normalizes backend response fields to UI-friendly keys expected by Analytics.jsx
 * Backend raw (per docs): {
 *   status, timestamp, database, collections: { lost_people, found_people, matches }, face_model_loaded
 * }
 * Returned normalized shape adds:
 *   mongodb_status, face_model_status, mongodb_collections, raw (original)
 */
export const healthCheck = async (config) => {
	const raw = await exec(client.get('/health', withConfig(config)));
	try {
		return {
			status: raw.status || 'unknown',
			timestamp: raw.timestamp || new Date().toISOString(),
			mongodb_status: raw.database || raw.mongodb_status || 'unknown',
			mongodb_collections: raw.collections || {},
			face_model_status: raw.face_model_loaded === true ? 'loaded' : (raw.face_model_loaded === false ? 'not_loaded' : 'unknown'),
			raw
		};
	} catch (e) {
		// Fallback to raw if normalization fails
		return raw;
	}
};

/**
 * 8. Get Statistics (GET /stats)
 * Backend raw (per docs): {
 *  lost_people, found_people, matches,
 *  lost_pending, lost_found,
 *  found_pending, found_matched,
 *  last_updated
 * }
 * Normalized fields added for Analytics.jsx:
 *  total_lost_people, total_found_people, total_matches,
 *  pending_lost, pending_found, pending_cases,
 *  match_rate (percent, 1 decimal),
 *  last_updated (pass-through), raw (original)
 */
export const getStats = async (config) => {
	const raw = await exec(client.get('/stats', withConfig(config)));
	try {
		const total_lost_people = raw.lost_people ?? 0;
		const total_found_people = raw.found_people ?? 0;
		const total_matches = raw.matches ?? 0;
		const pending_lost = raw.lost_pending ?? 0;
		const pending_found = raw.found_pending ?? 0;
		const pending_cases = pending_lost + pending_found;
		// Heuristic match rate: confirmed matches over combined population (avoid div/0)
		const denom = (total_lost_people + total_found_people) || 1;
		const match_rate = Number(((total_matches / denom) * 100).toFixed(1));
		return {
			...raw,
			total_lost_people,
			total_found_people,
			total_matches,
			pending_lost,
			pending_found,
			pending_cases,
			match_rate,
			last_updated: raw.last_updated || new Date().toISOString(),
			raw
		};
	} catch (e) {
		return raw; // fallback
	}
};

/**
 * 9. Check Matches for Face ID (GET /check_matches/{face_id})
 */
export const checkMatches = async (faceId, config) => {
	if (!faceId) throw new ApiError('faceId is required for checkMatches');
	return exec(client.get(`/check_matches/${encodeURIComponent(faceId)}`, withConfig(config)));
};

/**
 * 10. Manual Duplicate Cleanup (POST /cleanup_found_duplicates?threshold=...)
 * @param {number} [threshold] similarity threshold (float)
 */
export const cleanupFoundDuplicates = async (threshold, config) => {
	const params = {};
	if (threshold !== undefined && threshold !== null) params.threshold = threshold;
	return exec(client.post('/cleanup_found_duplicates', null, withConfig({ ...config, params })));
};

/**
 * 11. User Alerts (GET /alert/{user_id})
 * @param {string} userId
 */
export const getUserAlerts = async (userId, config) => {
	if (!userId) throw new ApiError('userId is required for getUserAlerts');
	return exec(client.get(`/alert/${encodeURIComponent(userId)}`, withConfig(config)));
};

/**
 * 12. Get Records By User (GET /get_records_by_user/{user_id})
 * Aggregates lost_people, found_people, match_records per spec.
 */
export const getRecordsByUser = async (userId, config) => {
	if (!userId) throw new ApiError('userId is required for getRecordsByUser');
	return exec(client.get(`/get_records_by_user/${encodeURIComponent(userId)}`, withConfig(config)));
};

/**
 * Normalize a searchFace (or record) response into a generic person object
 * used by certain UI tables (Case ID, Type, Status, Created, Location).
 * Accepts either the raw object returned by searchFace or a record wrapper.
 */
export const normalizePersonRecord = (res) => {
	if (!res) return null;
	if (res.not_found) return { not_found: true, face_id: res.face_id };
	const collection = res.collection || res._source || 'unknown';
	const record = res.record || res.data || res;
	const isLost = collection === 'lost_people';
	const location = isLost ? (record.where_lost || 'Unknown') : (record.location_found || record.where_found || 'Unknown');
	const rawStatus = record.status || 'pending';
	const status = rawStatus === 'pending' ? 'open' : (rawStatus === 'found' ? 'resolved' : rawStatus);
	return {
		id: record.face_id || record.match_id || 'unknown',
		type: 'person',
		name: record.name || 'Unknown',
		age: record.age,
		status,
		createdAt: record.upload_time || record.match_time || null,
		location,
		source: collection,
		raw: res
	};
};

/**
 * Backwards compatibility: createLostReport alias to new uploadLostPerson
 * (some older components might still import createLostReport)
 */
export const createLostReport = async (payload, config) => uploadLostPerson(payload, config);

/**
 * List Lost Reports (GET /get_all_lost)
 * Original placeholder used /lost-reports which 404s; real documented endpoint is /get_all_lost.
 */
export const listLostReports = async (params = {}, config) => exec(client.get('/get_all_lost', withConfig({ ...config })));

// ---------------------------------------------------------------------------
// Utility / Aggregated Export
// ---------------------------------------------------------------------------
export const apiService = {
	uploadFoundPerson,
	uploadLostPerson,
	searchFace,
	getAllLost,
	getAllFound,
	getAllMatches,
	healthCheck,
	getStats,
	checkMatches,
	cleanupFoundDuplicates,
	createLostReport,
	listLostReports,
	getUserAlerts,
	getRecordsByUser,
	normalizePersonRecord,
	client // expose raw axios instance for advanced usage
};

export default apiService;

// ---------------------------------------------------------------------------
// Example Usage (remove or adapt in components):
// import { uploadFoundPerson } from '@/Services/api';
// const res = await uploadFoundPerson({ name: 'John', gender: 'Male', age: 30, ... , file });
// console.log(res.matched_lost);
// ---------------------------------------------------------------------------
