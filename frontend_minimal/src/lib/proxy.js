// Enhanced fetch with retry, timeout, and error handling

import { QUERY_TIMEOUT } from "@/constants";

export async function fetchWithRetry(url, options = {}, retries = 3) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (retries > 0 && error.name !== 'AbortError') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithRetry(url, options, retries - 1);
    }
    
    throw error;
  }
}