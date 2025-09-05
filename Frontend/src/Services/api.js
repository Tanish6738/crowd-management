// Centralized API service for Lost & Found system endpoints.
// Covers endpoints documented in COMPLETE_API_DOCUMENTATION.md
// Endpoints:
// 1. POST /upload_found
// 2. GET  /search_face/{face_id}
// 3. GET  /get_all_lost
// 4. GET  /get_all_found
// 5. GET  /get_all_matches
// 6. GET  /health
// 7. GET  /stats
// 8. GET  /check_matches/{face_id}
// 9. POST /cleanup_found_duplicates?threshold=<float>

import axios from 'axios';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = (import.meta?.env?.VITE_API_URL || process.env.VITE_API_URL || '') || 'http://localhost:8000';

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
 * 2. Search Face by ID (GET /search_face/{face_id})
 */
export const searchFace = async (faceId, config) => {
	if (!faceId) throw new ApiError('faceId is required for searchFace');
	return exec(client.get(`/search_face/${encodeURIComponent(faceId)}`, withConfig(config)));
};

/**
 * 3. Get All Lost People (GET /get_all_lost)
 */
export const getAllLost = async (config) => exec(client.get('/get_all_lost', withConfig(config)));

/**
 * 4. Get All Found People (GET /get_all_found)
 */
export const getAllFound = async (config) => exec(client.get('/get_all_found', withConfig(config)));

/**
 * 5. Get All Matches (GET /get_all_matches)
 */
export const getAllMatches = async (config) => exec(client.get('/get_all_matches', withConfig(config)));

/**
 * 6. Health Check (GET /health)
 */
export const healthCheck = async (config) => exec(client.get('/health', withConfig(config)));

/**
 * 7. Get Statistics (GET /stats)
 */
export const getStats = async (config) => exec(client.get('/stats', withConfig(config)));

/**
 * 8. Check Matches for Face ID (GET /check_matches/{face_id})
 */
export const checkMatches = async (faceId, config) => {
	if (!faceId) throw new ApiError('faceId is required for checkMatches');
	return exec(client.get(`/check_matches/${encodeURIComponent(faceId)}`, withConfig(config)));
};

/**
 * 9. Manual Duplicate Cleanup (POST /cleanup_found_duplicates?threshold=...)
 * @param {number} [threshold] similarity threshold (float)
 */
export const cleanupFoundDuplicates = async (threshold, config) => {
	const params = {};
	if (threshold !== undefined && threshold !== null) params.threshold = threshold;
	return exec(client.post('/cleanup_found_duplicates', null, withConfig({ ...config, params })));
};

// ---------------------------------------------------------------------------
// Utility / Aggregated Export
// ---------------------------------------------------------------------------
export const apiService = {
	uploadFoundPerson,
	searchFace,
	getAllLost,
	getAllFound,
	getAllMatches,
	healthCheck,
	getStats,
	checkMatches,
	cleanupFoundDuplicates,
	client // expose raw axios instance for advanced usage
};

export default apiService;

// ---------------------------------------------------------------------------
// Example Usage (remove or adapt in components):
// import { uploadFoundPerson } from '@/Services/api';
// const res = await uploadFoundPerson({ name: 'John', gender: 'Male', age: 30, ... , file });
// console.log(res.matched_lost);
// ---------------------------------------------------------------------------
