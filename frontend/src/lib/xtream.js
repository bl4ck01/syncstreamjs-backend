// Xtream Codes helper: fetch categories and streams for live, VOD, and series

function buildUrl(baseUrl, path, params) {
    const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    return url.toString();
}

async function fetchJson(url) {
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`Request failed ${resp.status}`);
    const data = await resp.json();
    return data;
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

    // Fetch in parallel
    const [userInfo, liveCategories, vodCategories, seriesCategories, liveStreams, vodStreams, series] = await Promise.all([
        fetchJson(urls.userInfo),
        fetchJson(urls.liveCategories),
        fetchJson(urls.vodCategories),
        fetchJson(urls.seriesCategories),
        fetchJson(urls.liveStreams),
        fetchJson(urls.vodStreams),
        fetchJson(urls.series),
    ]);

    return {
        userInfo,
        categories: {
            live: liveCategories,
            vod: vodCategories,
            series: seriesCategories,
        },
        streams: {
            live: liveStreams,
            vod: vodStreams,
            series,
        },
        fetchedAt: Date.now(),
    };
}


