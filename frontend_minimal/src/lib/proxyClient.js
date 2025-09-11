// Client-side utilities for proxy server communication
const PROXY_BASE_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:8081';

// Build proxy URL on client side
export function buildProxyUrlClient(baseUrl, username, password, endpoint = 'get') {
  if (!baseUrl || !username || !password) {
    throw new Error('Missing required parameters: baseUrl, username, password');
  }
  
  const url = new URL(`/${endpoint}`, PROXY_BASE_URL.endsWith('/') ? PROXY_BASE_URL : PROXY_BASE_URL + '/');
  url.searchParams.set('base_url', baseUrl);
  url.searchParams.set('username', username);
  url.searchParams.set('password', password);
  return url.toString();
}

// Fetch proxy data on client side
export async function fetchProxyDataClient(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = 30000; // 30 seconds timeout for client-side requests
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      ...options,
    });
    
    clearTimeout(timer);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `Proxy request failed (${response.status})`);
    }
    
    const data = await response.json();
    
    if (!data?.success) {
      throw new Error(data?.message || 'Proxy returned unsuccessful response');
    }
    
    return data;
  } catch (error) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      throw new Error('Proxy request timed out');
    }
    throw error;
  }
}

// Fetch playlist data on client side
export async function fetchPlaylistDataClient({ baseUrl, username, password, endpoint = 'get' }) {
  const url = buildProxyUrlClient(baseUrl, username, password, endpoint);
  const response = await fetchProxyDataClient(url);
  
  if (!response.data) {
    throw new Error('Proxy returned no data');
  }
  
  return response.data;
}

// Get player info from proxy
export async function fetchPlayerInfoClient({ baseUrl, username, password, streamId }) {
  const url = buildProxyUrlClient(baseUrl, username, password, 'player');
  url.searchParams.set('stream_id', streamId);
  const response = await fetchProxyDataClient(url);
  
  if (!response.data) {
    throw new Error('Proxy returned no player data');
  }
  
  return response.data;
}

// Check if proxy is available
export async function checkProxyAvailability() {
  try {
    const testUrl = new URL('/health', PROXY_BASE_URL.endsWith('/') ? PROXY_BASE_URL : PROXY_BASE_URL + '/');
    const response = await fetch(testUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000) // 5 seconds timeout
    });
    
    return response.ok;
  } catch (error) {
    console.warn('Proxy health check failed:', error);
    return false;
  }
}