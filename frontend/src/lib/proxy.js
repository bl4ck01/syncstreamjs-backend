// Shared proxy client utilities

const PROXY_BASE_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:8081';

/**
 * Build a proxy URL for Xtream API calls
 * @param {string} baseUrl - IPTV server base URL
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {string} endpoint - Proxy endpoint ('get' or 'test')
 * @returns {string} Complete proxy URL
 */
export function buildProxyUrl(baseUrl, username, password, endpoint = 'get') {
	if (!baseUrl || !username || !password) {
		throw new Error('Missing required parameters: baseUrl, username, password');
	}
	
	const url = new URL(`/${endpoint}`, PROXY_BASE_URL.endsWith('/') ? PROXY_BASE_URL : PROXY_BASE_URL + '/');
	url.searchParams.set('base_url', baseUrl);
	url.searchParams.set('username', username);
	url.searchParams.set('password', password);
	return url.toString();
}

/**
 * Make a request to the proxy server
 * @param {string} url - Proxy URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Object>} Proxy response
 */
export async function fetchProxy(url, options = {}) {
	const response = await fetch(url, {
		cache: 'no-store',
		...options,
	});
	
	const data = await response.json().catch(() => null);
	
	if (!response.ok) {
		throw new Error(data?.message || `Proxy request failed (${response.status})`);
	}
	
	if (!data?.success) {
		throw new Error(data?.message || 'Proxy returned unsuccessful response');
	}
	
	return data;
}

/**
 * Test IPTV connection via proxy (lightweight - no data fetching)
 * @param {Object} params - Connection parameters
 * @param {string} params.baseUrl - IPTV server URL
 * @param {string} params.username - Username
 * @param {string} params.password - Password
 * @returns {Promise<Object>} Test result
 */
export async function testConnection({ baseUrl, username, password }) {
	try {
		const url = buildProxyUrl(baseUrl, username, password, 'test');
		const response = await fetchProxy(url);
		
		if (!response.data?.userInfo) {
			throw new Error('Invalid proxy response - missing user info');
		}
		
		return {
			success: true,
			userInfo: response.data.userInfo,
			message: response.message || 'Connection successful!'
		};
	} catch (error) {
		return {
			success: false,
			message: error.message,
			userInfo: null
		};
	}
}

/**
 * Fetch complete playlist data via proxy
 * @param {Object} params - Connection parameters
 * @param {string} params.baseUrl - IPTV server URL
 * @param {string} params.username - Username
 * @param {string} params.password - Password
 * @returns {Promise<Object>} Normalized playlist data
 */
export async function fetchPlaylistData({ baseUrl, username, password }) {
	const url = buildProxyUrl(baseUrl, username, password);
	const response = await fetchProxy(url);
	
	if (!response.data) {
		throw new Error('Proxy returned no data');
	}
	
	// Data is already normalized by the proxy
	return response.data;
}
