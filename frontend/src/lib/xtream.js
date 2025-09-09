// Xtream Codes helper: fetch categories and streams for live, VOD, and series

function buildUrl(baseUrl, path, params) {
    const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
}

async function fetchJson(url, retries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const resp = await fetch(url, { 
                cache: 'no-store',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (compatible; IPTV-Client/1.0)',
                }
            });
            
            if (!resp.ok) {
                const errorMsg = `HTTP ${resp.status}: ${resp.statusText}`;
                
                // Handle different HTTP errors
                if (resp.status === 404) {
                    throw new Error(`Error fetching data. Please check if the server URL and credentials are correct.`);
                } else if (resp.status === 429) {
                    throw new Error(`Rate limited (429). Too many requests to the IPTV server.`);
                } else if (resp.status === 403) {
                    throw new Error(`Access forbidden (403). Please check your credentials.`);
                } else if (resp.status === 401) {
                    throw new Error(`Unauthorized (401). Please check your credentials.`);
                } else if (resp.status >= 500) {
                    throw new Error(`Server error (${resp.status}). The server is experiencing issues.`);
                } else {
                    throw new Error(errorMsg);
                }
            }
            
            const data = await resp.json();
            return data;
        } catch (error) {
            // Handle network errors
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                if (attempt === retries) {
                    throw new Error(`Network error: Cannot reach ${url}. This could be due to CORS restrictions, network connectivity, or the server being down.`);
                }
            } else if (error.message.includes('404') || error.message.includes('429') || error.message.includes('Rate limited')) {
                // Don't retry for 404s and rate limits immediately, but wait longer
                if (attempt < retries) {
                    console.warn(`Attempt ${attempt} failed for ${url}: ${error.message}. Retrying in ${delay * attempt}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay * attempt));
                    continue;
                }
                throw error;
            } else {
                // For other errors, retry with shorter delay
                if (attempt < retries) {
                    console.warn(`Attempt ${attempt} failed for ${url}: ${error.message}. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw error;
            }
        }
    }
}

// Test connection function - only fetches user info to validate credentials quickly
export async function testXtreamConnection({ baseUrl, username, password }) {
    const params = { username, password };
    const apiPath = 'player_api.php';
    
    const userInfoUrl = buildUrl(baseUrl, apiPath, { ...params, action: 'get_user_info' });
    
    try {
        console.log('Testing IPTV connection...');
        const userInfo = await fetchJson(userInfoUrl, 1, 500); // Single retry, faster timeout
        
        // Check if the response contains valid user info
        if (!userInfo || typeof userInfo !== 'object') {
            throw new Error('Invalid response from IPTV server. Please check your credentials.');
        }
        
        // Check for common error patterns in user info response
        if (userInfo.message && userInfo.message.includes('INVALID')) {
            throw new Error('Invalid IPTV credentials. Please check your username and password.');
        }
        
        console.log('IPTV connection test successful');
        return {
            success: true,
            userInfo,
            message: 'Connection successful!'
        };
    } catch (error) {
        console.log('IPTV connection test failed:', error.message);
        return {
            success: false,
            message: error.message,
            userInfo: null
        };
    }
}

export async function fetchXtreamAllData({ baseUrl, username, password }) {
    // Common params for Xtream player_api.php
    const params = { username, password };
    const apiPath = 'player_api.php';

    // Endpoints
    const urls = {
        userInfo: buildUrl(baseUrl, apiPath, { ...params, action: 'get_user_info' }),
        liveCategories: buildUrl(baseUrl, apiPath, { ...params, action: 'get_live_categories' }),
        vodCategories: buildUrl(baseUrl, apiPath, { ...params, action: 'get_vod_categories' }),
        seriesCategories: buildUrl(baseUrl, apiPath, { ...params, action: 'get_series_categories' }),
        liveStreams: buildUrl(baseUrl, apiPath, { ...params, action: 'get_live_streams' }),
        vodStreams: buildUrl(baseUrl, apiPath, { ...params, action: 'get_vod_streams' }),
        series: buildUrl(baseUrl, apiPath, { ...params, action: 'get_series' }),
    };

    try {
        // Fetch user info first to validate credentials
        console.log('Fetching IPTV user info...');
        const userInfo = await fetchJson(urls.userInfo);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Fetch categories and streams in batches to reduce server load
        console.log('Fetching IPTV categories...');
        const [liveCategories, vodCategories, seriesCategories] = await Promise.all([
            fetchJson(urls.liveCategories),
            fetchJson(urls.vodCategories),
            fetchJson(urls.seriesCategories),
        ]);
        
        // Add delay between batches
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log('Fetching IPTV streams...');
        const [liveStreams, vodStreams, series] = await Promise.all([
            fetchJson(urls.liveStreams),
            fetchJson(urls.vodStreams),
            fetchJson(urls.series),
        ]);

        console.log('IPTV data fetched successfully');
        
        return {
            userInfo,
            categories: {
                live: liveCategories || [],
                vod: vodCategories || [],
                series: seriesCategories || [],
            },
            streams: {
                live: liveStreams || [],
                vod: vodStreams || [],
                series: series || [],
            },
            fetchedAt: Date.now(),
        };
    } catch (error) {
        console.error('Failed to fetch IPTV data:', error.message);
        throw new Error(`IPTV data fetch failed: ${error.message}`);
    }
}


