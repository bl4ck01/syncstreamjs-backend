

# IPTV Frontend Implementation Plan with Next.js and DuckDB-WASM

I'll create a comprehensive frontend structure for your IPTV application that efficiently handles large playlists with potentially 200k+ streams. Let's start with a detailed optimized plan and then provide the code snippets.

## Detailed Implementation Plan

### 1. Optimizations Strategy

1. **Database Optimization**:
   - Use DuckDB-WASM for client-side SQL queries
   - Store only essential data in the browser
   - Create efficient indexes for fast querying
   - Implement proper data normalization

2. **Progressive Loading**:
   - Initial load: Only 20 categories per content type
   - Per category: Only 30 streams initially
   - Implement infinite scroll for both categories and streams
   - Trigger loading when user reaches 75% of loaded content

3. **Performance Optimizations**:
   - Debounce search functionality
   - Implement image lazy loading
   - Use virtualization for large lists
   - Cache data in browser storage

4. **State Management**:
   - Use Zustand for efficient state handling
   - Separate stores for each content type
   - Implement proper error boundaries
   - Manage loading states effectively

### 2. Project Structure

```
frontend/
├── app/
│   ├── (main)/
│   │   ├── live/
│   │   │   └── page.js
│   │   ├── movies/
│   │   │   └── page.js
│   │   ├── series/
│   │   │   └── page.js
│   │   └── layout.js
│   ├── layout.js
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── loading.js
│   │   ├── error.js
│   │   └── ...
│   ├── live/
│   │   ├── category-list.js
│   │   ├── stream-list.js
│   │   └── ...
│   ├── movies/
│   │   ├── category-list.js
│   │   ├── movie-list.js
│   │   └── ...
│   ├── series/
│   │   ├── category-list.js
│   │   ├── series-list.js
│   │   └── ...
│   └── common/
│       ├── infinite-scroll.js
│       └── ...
├── lib/
│   ├── duckdb.js
│   ├── api.js
│   ├── proxy.js
│   └── utils.js
├── store/
│   ├── use-live-store.js
│   ├── use-movies-store.js
│   ├── use-series-store.js
│   └── use-common-store.js
└── package.json
```

## Code Implementation

### 1. Database Setup (lib/duckdb.js)

```javascript
import * as duckdb from '@duckdb/duckdb-wasm';

let db = null;
let connection = null;

export async function initDuckDB() {
  if (db) return db;
  
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  
  // Select a bundle based on browser checks
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  
  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'application/javascript' })
  );
  
  // Instantiate the asynchronous version of DuckDB-wasm
  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);
  
  connection = await db.connect();
  
  // Create tables
  await createTables();
  
  return db;
}

async function createTables() {
  await connection.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      category_id VARCHAR PRIMARY KEY,
      category_name VARCHAR,
      type VARCHAR CHECK(type IN ('live', 'vod', 'series')),
      stream_count INTEGER
    );
  `);
  
  await connection.exec(`
    CREATE TABLE IF NOT EXISTS live_streams (
      stream_id INTEGER PRIMARY KEY,
      name VARCHAR,
      category_id VARCHAR,
      stream_icon VARCHAR,
      num INTEGER,
      added VARCHAR,
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
    );
  `);
  
  await connection.exec(`
    CREATE TABLE IF NOT EXISTS movie_streams (
      stream_id INTEGER PRIMARY KEY,
      name VARCHAR,
      category_id VARCHAR,
      stream_icon VARCHAR,
      num INTEGER,
      added VARCHAR,
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
    );
  `);
  
  await connection.exec(`
    CREATE TABLE IF NOT EXISTS series (
      series_id INTEGER PRIMARY KEY,
      name VARCHAR,
      category_id VARCHAR,
      cover VARCHAR,
      plot VARCHAR,
      genre VARCHAR,
      releaseDate VARCHAR,
      rating VARCHAR,
      num INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
    );
  `);
  
  // Create indexes for faster querying
  await connection.exec('CREATE INDEX IF NOT EXISTS idx_live_category ON live_streams(category_id);');
  await connection.exec('CREATE INDEX IF NOT EXISTS idx_movie_category ON movie_streams(category_id);');
  await connection.exec('CREATE INDEX IF NOT EXISTS idx_series_category ON series(category_id);');
}

export async function insertCategories(categories, type) {
  await initDuckDB();
  
  const values = categories.map(cat => 
    `('${cat.category_id}', '${cat.category_name.replace(/'/g, "''")}', '${type}', ${cat.stream_count || 0})`
  ).join(',');
  
  await connection.exec(`
    INSERT OR REPLACE INTO categories (category_id, category_name, type, stream_count)
    VALUES ${values};
  `);
}

export async function insertLiveStreams(streams) {
  await initDuckDB();
  
  const values = streams.map(stream => 
    `(${stream.stream_id}, '${stream.name.replace(/'/g, "''")}', '${stream.category_id}', '${stream.stream_icon}', ${stream.num}, '${stream.added}')`
  ).join(',');
  
  await connection.exec(`
    INSERT OR REPLACE INTO live_streams (stream_id, name, category_id, stream_icon, num, added)
    VALUES ${values};
  `);
}

export async function insertMovieStreams(streams) {
  await initDuckDB();
  
  const values = streams.map(stream => 
    `(${stream.stream_id}, '${stream.name.replace(/'/g, "''")}', '${stream.category_id}', '${stream.stream_icon}', ${stream.num}, '${stream.added}')`
  ).join(',');
  
  await connection.exec(`
    INSERT OR REPLACE INTO movie_streams (stream_id, name, category_id, stream_icon, num, added)
    VALUES ${values};
  `);
}

export async function insertSeries(series) {
  await initDuckDB();
  
  const values = series.map(s => 
    `(${s.series_id}, '${s.name.replace(/'/g, "''")}', '${s.category_id}', '${s.cover}', '${s.plot.replace(/'/g, "''")}', '${s.genre.replace(/'/g, "''")}', '${s.releaseDate}', '${s.rating}', ${s.num})`
  ).join(',');
  
  await connection.exec(`
    INSERT OR REPLACE INTO series (series_id, name, category_id, cover, plot, genre, releaseDate, rating, num)
    VALUES ${values};
  `);
}

export async function getCategories(type, offset = 0, limit = 20) {
  await initDuckDB();
  
  const result = await connection.exec(`
    SELECT * FROM categories
    WHERE type = '${type}'
    ORDER BY category_name
    LIMIT ${limit} OFFSET ${offset};
  `);
  
  return result.toArray().map(row => ({
    category_id: row.category_id,
    category_name: row.category_name,
    type: row.type,
    stream_count: row.stream_count
  }));
}

export async function getLiveStreams(categoryId, offset = 0, limit = 30) {
  await initDuckDB();
  
  const result = await connection.exec(`
    SELECT * FROM live_streams
    WHERE category_id = '${categoryId}'
    ORDER BY num
    LIMIT ${limit} OFFSET ${offset};
  `);
  
  return result.toArray().map(row => ({
    stream_id: row.stream_id,
    name: row.name,
    category_id: row.category_id,
    stream_icon: row.stream_icon,
    num: row.num,
    added: row.added,
    stream_type: 'live'
  }));
}

export async function getMovieStreams(categoryId, offset = 0, limit = 30) {
  await initDuckDB();
  
  const result = await connection.exec(`
    SELECT * FROM movie_streams
    WHERE category_id = '${categoryId}'
    ORDER BY num
    LIMIT ${limit} OFFSET ${offset};
  `);
  
  return result.toArray().map(row => ({
    stream_id: row.stream_id,
    name: row.name,
    category_id: row.category_id,
    stream_icon: row.stream_icon,
    num: row.num,
    added: row.added,
    stream_type: 'movie'
  }));
}

export async function getSeries(categoryId, offset = 0, limit = 30) {
  await initDuckDB();
  
  const result = await connection.exec(`
    SELECT * FROM series
    WHERE category_id = '${categoryId}'
    ORDER BY num
    LIMIT ${limit} OFFSET ${offset};
  `);
  
  return result.toArray().map(row => ({
    series_id: row.series_id,
    name: row.name,
    category_id: row.category_id,
    cover: row.cover,
    plot: row.plot,
    genre: row.genre,
    releaseDate: row.releaseDate,
    rating: row.rating,
    num: row.num,
    stream_type: 'series'
  }));
}

export async function searchStreams(query, type, offset = 0, limit = 30) {
  await initDuckDB();
  
  let tableName = '';
  switch (type) {
    case 'live':
      tableName = 'live_streams';
      break;
    case 'vod':
      tableName = 'movie_streams';
      break;
    case 'series':
      tableName = 'series';
      break;
    default:
      return [];
  }
  
  const result = await connection.exec(`
    SELECT * FROM ${tableName}
    WHERE name LIKE '%${query.replace(/'/g, "''")}%'
    ORDER BY name
    LIMIT ${limit} OFFSET ${offset};
  `);
  
  return result.toArray().map(row => {
    const item = { ...row };
    if (type !== 'series') {
      item.stream_type = type === 'live' ? 'live' : 'movie';
    } else {
      item.stream_type = 'series';
    }
    return item;
  });
}

export async function clearDatabase() {
  await initDuckDB();
  
  await connection.exec('DELETE FROM categories;');
  await connection.exec('DELETE FROM live_streams;');
  await connection.exec('DELETE FROM movie_streams;');
  await connection.exec('DELETE FROM series;');
}
```

### 2. API Functions (lib/api.js)

```javascript
// Server actions
export async function performRequest(endpoint, options = {}) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
  const url = `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export async function getCurrentProfile() {
  const data = await performRequest('/profiles/current');
  return data;
}

export async function getDefaultPlaylistId() {
  const me = await getCurrentProfile();
  if (!me?.success) return { success: false, message: me?.message || 'Unable to load profile' };
  const id = me?.data?.default_playlist_id || null;
  return { success: true, data: { default_playlist_id: id } };
}

export async function getPlaylist(id) {
  const data = await performRequest(`/playlists/${id}`);
  console.log('[Playlist Actions] Playlist fetch result:', data);
  return data;
}
```

### 3. Proxy Functions (lib/proxy.js)

```javascript
const PROXY_BASE_URL = process.env.NEXT_PUBLIC_PROXY_BASE_URL || 'http://localhost:3001';

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

export async function fetchPlaylistData({ baseUrl, username, password }) {
  const url = buildProxyUrl(baseUrl, username, password);
  const response = await fetchProxy(url);
  
  if (!response.data) {
    throw new Error('Proxy returned no data');
  }
  
  // Data is already normalized by the proxy
  return response.data;
}

// Client-side function to load playlist data into DuckDB
export async function loadPlaylistData(playlistData) {
  const { categories, categorizedStreams } = playlistData;
  
  // Clear existing data
  await clearDatabase();
  
  // Insert categories
  if (categories.live) {
    await insertCategories(categories.live, 'live');
  }
  if (categories.vod) {
    await insertCategories(categories.vod, 'vod');
  }
  if (categories.series) {
    await insertCategories(categories.series, 'series');
  }
  
  // Insert streams
  if (categorizedStreams.live) {
    for (const category of categorizedStreams.live) {
      await insertLiveStreams(category.streams);
    }
  }
  if (categorizedStreams.vod) {
    for (const category of categorizedStreams.vod) {
      await insertMovieStreams(category.streams);
    }
  }
  if (categorizedStreams.series) {
    for (const category of categorizedStreams.series) {
      await insertSeries(category.streams);
    }
  }
}
```

### 4. Utility Functions (lib/utils.js)

```javascript
import { initDuckDB } from './duckdb';

export async function initializeApp() {
  try {
    // Initialize DuckDB
    await initDuckDB();
    
    // Get user profile and default playlist
    const profileResult = await getCurrentProfile();
    if (!profileResult.success) {
      throw new Error(profileResult.message || 'Failed to get user profile');
    }
    
    const playlistResult = await getDefaultPlaylistId();
    if (!playlistResult.success) {
      throw new Error(playlistResult.message || 'Failed to get default playlist');
    }
    
    const { default_playlist_id } = playlistResult.data;
    if (!default_playlist_id) {
      throw new Error('No default playlist found');
    }
    
    // Get playlist details
    const playlistDetails = await getPlaylist(default_playlist_id);
    if (!playlistDetails.success) {
      throw new Error(playlistDetails.message || 'Failed to get playlist details');
    }
    
    const { server_url, username, password } = playlistDetails.data;
    
    // Fetch playlist data from proxy
    const playlistData = await fetchPlaylistData({
      baseUrl: server_url,
      username,
      password
    });
    
    // Load playlist data into DuckDB
    await loadPlaylistData(playlistData);
    
    return {
      success: true,
      data: {
        profile: profileResult.data,
        playlist: playlistDetails.data,
        playlistStats: playlistData.statistics
      }
    };
  } catch (error) {
    console.error('Error initializing app:', error);
    return {
      success: false,
      message: error.message || 'Failed to initialize app'
    };
  }
}

export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

### 5. Common Store (store/use-common-store.js)

```javascript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useCommonStore = create(
  devtools(
    persist(
      (set, get) => ({
        // App state
        isInitialized: false,
        isLoading: false,
        error: null,
        
        // User data
        user: null,
        playlist: null,
        playlistStats: null,
        
        // Actions
        setInitialized: (isInitialized) => set({ isInitialized }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
        
        setUser: (user) => set({ user }),
        setPlaylist: (playlist) => set({ playlist }),
        setPlaylistStats: (playlistStats) => set({ playlistStats }),
        
        reset: () => set({
          isInitialized: false,
          isLoading: false,
          error: null,
          user: null,
          playlist: null,
          playlistStats: null,
        }),
      }),
      {
        name: 'common-storage',
        partialize: (state) => ({
          user: state.user,
          playlist: state.playlist,
          playlistStats: state.playlistStats,
        }),
      }
    ),
    { name: 'common-store' }
  )
);
```

### 6. Live Store (store/use-live-store.js)

```javascript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getCategories, getLiveStreams } from '@/lib/duckdb';

export const useLiveStore = create(
  devtools(
    (set, get) => ({
      // Categories
      categories: [],
      categoriesLoading: false,
      categoriesError: null,
      categoriesHasMore: true,
      categoriesOffset: 0,
      categoriesLimit: 20,
      
      // Streams
      streams: {},
      streamsLoading: {},
      streamsError: {},
      streamsHasMore: {},
      streamsOffset: {},
      streamsLimit: 30,
      
      // Actions
      fetchCategories: async () => {
        const { categoriesLoading, categoriesHasMore, categoriesOffset, categoriesLimit } = get();
        
        if (categoriesLoading || !categoriesHasMore) return;
        
        set({ categoriesLoading: true, categoriesError: null });
        
        try {
          const result = await getCategories('live', categoriesOffset, categoriesLimit);
          
          set((state) => ({
            categories: [...state.categories, ...result],
            categoriesLoading: false,
            categoriesHasMore: result.length === categoriesLimit,
            categoriesOffset: state.categoriesOffset + categoriesLimit,
          }));
          
          // Initialize streams state for new categories
          const newStreamsState = {};
          const newStreamsLoadingState = {};
          const newStreamsErrorState = {};
          const newStreamsHasMoreState = {};
          const newStreamsOffsetState = {};
          
          result.forEach(category => {
            if (!get().streams[category.category_id]) {
              newStreamsState[category.category_id] = [];
              newStreamsLoadingState[category.category_id] = false;
              newStreamsErrorState[category.category_id] = null;
              newStreamsHasMoreState[category.category_id] = true;
              newStreamsOffsetState[category.category_id] = 0;
            }
          });
          
          if (Object.keys(newStreamsState).length > 0) {
            set((state) => ({
              streams: { ...state.streams, ...newStreamsState },
              streamsLoading: { ...state.streamsLoading, ...newStreamsLoadingState },
              streamsError: { ...state.streamsError, ...newStreamsErrorState },
              streamsHasMore: { ...state.streamsHasMore, ...newStreamsHasMoreState },
              streamsOffset: { ...state.streamsOffset, ...newStreamsOffsetState },
            }));
          }
        } catch (error) {
          set({ categoriesLoading: false, categoriesError: error.message });
        }
      },
      
      fetchStreams: async (categoryId) => {
        const { 
          streamsLoading, 
          streamsHasMore, 
          streamsOffset, 
          streamsLimit,
          streams 
        } = get();
        
        if (
          streamsLoading[categoryId] || 
          !streamsHasMore[categoryId] ||
          !streams[categoryId]
        ) return;
        
        set((state) => ({
          streamsLoading: { 
            ...state.streamsLoading, 
            [categoryId]: true 
          },
          streamsError: { 
            ...state.streamsError, 
            [categoryId]: null 
          }
        }));
        
        try {
          const result = await getLiveStreams(
            categoryId, 
            streamsOffset[categoryId], 
            streamsLimit
          );
          
          set((state) => ({
            streams: {
              ...state.streams,
              [categoryId]: [...state.streams[categoryId], ...result]
            },
            streamsLoading: { 
              ...state.streamsLoading, 
              [categoryId]: false 
            },
            streamsHasMore: { 
              ...state.streamsHasMore, 
              [categoryId]: result.length === streamsLimit 
            },
            streamsOffset: {
              ...state.streamsOffset,
              [categoryId]: state.streamsOffset[categoryId] + streamsLimit
            }
          }));
        } catch (error) {
          set((state) => ({
            streamsLoading: { 
              ...state.streamsLoading, 
              [categoryId]: false 
            },
            streamsError: { 
              ...state.streamsError, 
              [categoryId]: error.message 
            }
          }));
        }
      },
      
      reset: () => set({
        categories: [],
        categoriesLoading: false,
        categoriesError: null,
        categoriesHasMore: true,
        categoriesOffset: 0,
        categoriesLimit: 20,
        streams: {},
        streamsLoading: {},
        streamsError: {},
        streamsHasMore: {},
        streamsOffset: {},
        streamsLimit: 30,
      }),
    }),
    { name: 'live-store' }
  )
);
```

### 7. Movies Store (store/use-movies-store.js)

```javascript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getCategories, getMovieStreams } from '@/lib/duckdb';

export const useMoviesStore = create(
  devtools(
    (set, get) => ({
      // Categories
      categories: [],
      categoriesLoading: false,
      categoriesError: null,
      categoriesHasMore: true,
      categoriesOffset: 0,
      categoriesLimit: 20,
      
      // Streams
      streams: {},
      streamsLoading: {},
      streamsError: {},
      streamsHasMore: {},
      streamsOffset: {},
      streamsLimit: 30,
      
      // Actions
      fetchCategories: async () => {
        const { categoriesLoading, categoriesHasMore, categoriesOffset, categoriesLimit } = get();
        
        if (categoriesLoading || !categoriesHasMore) return;
        
        set({ categoriesLoading: true, categoriesError: null });
        
        try {
          const result = await getCategories('vod', categoriesOffset, categoriesLimit);
          
          set((state) => ({
            categories: [...state.categories, ...result],
            categoriesLoading: false,
            categoriesHasMore: result.length === categoriesLimit,
            categoriesOffset: state.categoriesOffset + categoriesLimit,
          }));
          
          // Initialize streams state for new categories
          const newStreamsState = {};
          const newStreamsLoadingState = {};
          const newStreamsErrorState = {};
          const newStreamsHasMoreState = {};
          const newStreamsOffsetState = {};
          
          result.forEach(category => {
            if (!get().streams[category.category_id]) {
              newStreamsState[category.category_id] = [];
              newStreamsLoadingState[category.category_id] = false;
              newStreamsErrorState[category.category_id] = null;
              newStreamsHasMoreState[category.category_id] = true;
              newStreamsOffsetState[category.category_id] = 0;
            }
          });
          
          if (Object.keys(newStreamsState).length > 0) {
            set((state) => ({
              streams: { ...state.streams, ...newStreamsState },
              streamsLoading: { ...state.streamsLoading, ...newStreamsLoadingState },
              streamsError: { ...state.streamsError, ...newStreamsErrorState },
              streamsHasMore: { ...state.streamsHasMore, ...newStreamsHasMoreState },
              streamsOffset: { ...state.streamsOffset, ...newStreamsOffsetState },
            }));
          }
        } catch (error) {
          set({ categoriesLoading: false, categoriesError: error.message });
        }
      },
      
      fetchStreams: async (categoryId) => {
        const { 
          streamsLoading, 
          streamsHasMore, 
          streamsOffset, 
          streamsLimit,
          streams 
        } = get();
        
        if (
          streamsLoading[categoryId] || 
          !streamsHasMore[categoryId] ||
          !streams[categoryId]
        ) return;
        
        set((state) => ({
          streamsLoading: { 
            ...state.streamsLoading, 
            [categoryId]: true 
          },
          streamsError: { 
            ...state.streamsError, 
            [categoryId]: null 
          }
        }));
        
        try {
          const result = await getMovieStreams(
            categoryId, 
            streamsOffset[categoryId], 
            streamsLimit
          );
          
          set((state) => ({
            streams: {
              ...state.streams,
              [categoryId]: [...state.streams[categoryId], ...result]
            },
            streamsLoading: { 
              ...state.streamsLoading, 
              [categoryId]: false 
            },
            streamsHasMore: { 
              ...state.streamsHasMore, 
              [categoryId]: result.length === streamsLimit 
            },
            streamsOffset: {
              ...state.streamsOffset,
              [categoryId]: state.streamsOffset[categoryId] + streamsLimit
            }
          }));
        } catch (error) {
          set((state) => ({
            streamsLoading: { 
              ...state.streamsLoading, 
              [categoryId]: false 
            },
            streamsError: { 
              ...state.streamsError, 
              [categoryId]: error.message 
            }
          }));
        }
      },
      
      reset: () => set({
        categories: [],
        categoriesLoading: false,
        categoriesError: null,
        categoriesHasMore: true,
        categoriesOffset: 0,
        categoriesLimit: 20,
        streams: {},
        streamsLoading: {},
        streamsError: {},
        streamsHasMore: {},
        streamsOffset: {},
        streamsLimit: 30,
      }),
    }),
    { name: 'movies-store' }
  )
);
```

### 8. Series Store (store/use-series-store.js)

```javascript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getCategories, getSeries } from '@/lib/duckdb';

export const useSeriesStore = create(
  devtools(
    (set, get) => ({
      // Categories
      categories: [],
      categoriesLoading: false,
      categoriesError: null,
      categoriesHasMore: true,
      categoriesOffset: 0,
      categoriesLimit: 20,
      
      // Streams
      streams: {},
      streamsLoading: {},
      streamsError: {},
      streamsHasMore: {},
      streamsOffset: {},
      streamsLimit: 30,
      
      // Actions
      fetchCategories: async () => {
        const { categoriesLoading, categoriesHasMore, categoriesOffset, categoriesLimit } = get();
        
        if (categoriesLoading || !categoriesHasMore) return;
        
        set({ categoriesLoading: true, categoriesError: null });
        
        try {
          const result = await getCategories('series', categoriesOffset, categoriesLimit);
          
          set((state) => ({
            categories: [...state.categories, ...result],
            categoriesLoading: false,
            categoriesHasMore: result.length === categoriesLimit,
            categoriesOffset: state.categoriesOffset + categoriesLimit,
          }));
          
          // Initialize streams state for new categories
          const newStreamsState = {};
          const newStreamsLoadingState = {};
          const newStreamsErrorState = {};
          const newStreamsHasMoreState = {};
          const newStreamsOffsetState = {};
          
          result.forEach(category => {
            if (!get().streams[category.category_id]) {
              newStreamsState[category.category_id] = [];
              newStreamsLoadingState[category.category_id] = false;
              newStreamsErrorState[category.category_id] = null;
              newStreamsHasMoreState[category.category_id] = true;
              newStreamsOffsetState[category.category_id] = 0;
            }
          });
          
          if (Object.keys(newStreamsState).length > 0) {
            set((state) => ({
              streams: { ...state.streams, ...newStreamsState },
              streamsLoading: { ...state.streamsLoading, ...newStreamsLoadingState },
              streamsError: { ...state.streamsError, ...newStreamsErrorState },
              streamsHasMore: { ...state.streamsHasMore, ...newStreamsHasMoreState },
              streamsOffset: { ...state.streamsOffset, ...newStreamsOffsetState },
            }));
          }
        } catch (error) {
          set({ categoriesLoading: false, categoriesError: error.message });
        }
      },
      
      fetchStreams: async (categoryId) => {
        const { 
          streamsLoading, 
          streamsHasMore, 
          streamsOffset, 
          streamsLimit,
          streams 
        } = get();
        
        if (
          streamsLoading[categoryId] || 
          !streamsHasMore[categoryId] ||
          !streams[categoryId]
        ) return;
        
        set((state) => ({
          streamsLoading: { 
            ...state.streamsLoading, 
            [categoryId]: true 
          },
          streamsError: { 
            ...state.streamsError, 
            [categoryId]: null 
          }
        }));
        
        try {
          const result = await getSeries(
            categoryId, 
            streamsOffset[categoryId], 
            streamsLimit
          );
          
          set((state) => ({
            streams: {
              ...state.streams,
              [categoryId]: [...state.streams[categoryId], ...result]
            },
            streamsLoading: { 
              ...state.streamsLoading, 
              [categoryId]: false 
            },
            streamsHasMore: { 
              ...state.streamsHasMore, 
              [categoryId]: result.length === streamsLimit 
            },
            streamsOffset: {
              ...state.streamsOffset,
              [categoryId]: state.streamsOffset[categoryId] + streamsLimit
            }
          }));
        } catch (error) {
          set((state) => ({
            streamsLoading: { 
              ...state.streamsLoading, 
              [categoryId]: false 
            },
            streamsError: { 
              ...state.streamsError, 
              [categoryId]: error.message 
            }
          }));
        }
      },
      
      reset: () => set({
        categories: [],
        categoriesLoading: false,
        categoriesError: null,
        categoriesHasMore: true,
        categoriesOffset: 0,
        categoriesLimit: 20,
        streams: {},
        streamsLoading: {},
        streamsError: {},
        streamsHasMore: {},
        streamsOffset: {},
        streamsLimit: 30,
      }),
    }),
    { name: 'series-store' }
  )
);
```

### 9. Infinite Scroll Component (components/common/infinite-scroll.js)

```javascript
'use client';

import { useEffect, useRef } from 'react';

export default function InfiniteScroll({ 
  children, 
  onLoadMore, 
  hasMore, 
  loading, 
  threshold = 200,
  rootMargin = '0px'
}) {
  const observer = useRef();
  const lastElementRef = useRef();
  
  useEffect(() => {
    if (loading || !hasMore) return;
    
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { threshold, rootMargin }
    );
    
    if (lastElementRef.current) {
      observer.current.observe(lastElementRef.current);
    }
    
    return () => {
      if (observer.current && lastElementRef.current) {
        observer.current.unobserve(lastElementRef.current);
      }
    };
  }, [loading, hasMore, onLoadMore, threshold, rootMargin]);
  
  return (
    <>
      {children}
      {hasMore && (
        <div ref={lastElementRef} className="loading-indicator">
          {loading && <div>Loading more...</div>}
        </div>
      )}
    </>
  );
}
```

### 10. Loading Component (components/ui/loading.js)

```javascript
export default function Loading() {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
```

### 11. Error Component (components/ui/error.js)

```javascript
export default function Error({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-4">
      <div className="text-red-500 text-xl mb-4">Error</div>
      <div className="text-gray-700 mb-4">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
```

### 12. Live Category List Component (components/live/category-list.js)

```javascript
'use client';

import { useEffect } from 'react';
import { useLiveStore } from '@/store/use-live-store';
import InfiniteScroll from '@/components/common/infinite-scroll';
import Loading from '@/components/ui/loading';
import Error from '@/components/ui/error';
import StreamList from './stream-list';

export default function CategoryList() {
  const {
    categories,
    categoriesLoading,
    categoriesError,
    categoriesHasMore,
    fetchCategories,
    streams,
    streamsLoading,
    streamsError,
    fetchStreams
  } = useLiveStore();
  
  useEffect(() => {
    if (categories.length === 0 && !categoriesLoading && !categoriesError) {
      fetchCategories();
    }
  }, [categories.length, categoriesLoading, categoriesError, fetchCategories]);
  
  if (categoriesLoading && categories.length === 0) {
    return <Loading />;
  }
  
  if (categoriesError && categories.length === 0) {
    return <Error message={categoriesError} onRetry={fetchCategories} />;
  }
  
  return (
    <div className="space-y-8">
      <InfiniteScroll
        onLoadMore={fetchCategories}
        hasMore={categoriesHasMore}
        loading={categoriesLoading}
        threshold={100}
      >
        {categories.map((category, index) => (
          <div key={category.category_id} className="category-section">
            <h2 className="text-xl font-bold mb-4">
              {category.category_name} ({category.stream_count})
            </h2>
            <StreamList
              categoryId={category.category_id}
              streams={streams[category.category_id] || []}
              loading={streamsLoading[category.category_id]}
              error={streamsError[category.category_id]}
              onLoadMore={() => fetchStreams(category.category_id)}
              hasMore={streams[category.category_id] ? true : false}
            />
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
}
```

### 13. Live Stream List Component (components/live/stream-list.js)

```javascript
'use client';

import { useEffect } from 'react';
import InfiniteScroll from '@/components/common/infinite-scroll';
import Loading from '@/components/ui/loading';
import Error from '@/components/ui/error';

export default function StreamList({ 
  categoryId, 
  streams, 
  loading, 
  error, 
  onLoadMore, 
  hasMore 
}) {
  useEffect(() => {
    if (streams.length === 0 && !loading && !error) {
      onLoadMore();
    }
  }, [streams.length, loading, error, onLoadMore]);
  
  if (loading && streams.length === 0) {
    return <Loading />;
  }
  
  if (error && streams.length === 0) {
    return <Error message={error} onRetry={onLoadMore} />;
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <InfiniteScroll
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        loading={loading}
        threshold={100}
      >
        {streams.map((stream) => (
          <div 
            key={stream.stream_id} 
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
          >
            <div className="aspect-video bg-gray-200 relative">
              {stream.stream_icon ? (
                <img 
                  src={stream.stream_icon} 
                  alt={stream.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder.png';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                  <span className="text-gray-500">No Image</span>
                </div>
              )}
              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                LIVE
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm truncate">{stream.name}</h3>
            </div>
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
}
```

### 14. Live Page (app/(main)/live/page.js)

```javascript
'use client';

import { useEffect } from 'react';
import { useCommonStore } from '@/store/use-common-store';
import { useLiveStore } from '@/store/use-live-store';
import { initializeApp } from '@/lib/utils';
import CategoryList from '@/components/live/category-list';

export default function LivePage() {
  const { isInitialized, isLoading, error, setInitialized, setLoading, setError } = useCommonStore();
  const { reset } = useLiveStore();
  
  useEffect(() => {
    const initApp = async () => {
      if (isInitialized) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const result = await initializeApp();
        if (result.success) {
          setInitialized(true);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize app');
      } finally {
        setLoading(false);
      }
    };
    
    initApp();
  }, [isInitialized, setLoading, setError, setInitialized]);
  
  useEffect(() => {
    reset();
  }, [reset]);
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <div className="text-gray-700 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Live Channels</h1>
      <CategoryList />
    </div>
  );
}
```

### 15. Main Layout (app/(main)/layout.js)

```javascript
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCommonStore } from '@/store/use-common-store';

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const { playlistStats } = useCommonStore();
  
  const navItems = [
    { href: '/live', label: 'Live', count: playlistStats?.totalLive || 0 },
    { href: '/movies', label: 'Movies', count: playlistStats?.totalVod || 0 },
    { href: '/series', label: 'Series', count: playlistStats?.totalSeries || 0 },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                IPTV Player
              </Link>
            </div>
            <nav className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === item.href
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label} ({item.count})
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      
      <main>{children}</main>
      
      <footer className="bg-white border-t mt-8">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} IPTV Player. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
```

### 16. Root Layout (app/layout.js)

```javascript
import './globals.css';

export const metadata = {
  title: 'IPTV Player',
  description: 'Watch your favorite live channels, movies, and series',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### 17. Global Styles (app/globals.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Inter', sans-serif;
}

.category-section {
  scroll-margin-top: 100px;
}

.loading-indicator {
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### 18. Package.json

```json
{
  "name": "iptv-player",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@duckdb/duckdb-wasm": "^1.28.0",
    "next": "13.4.19",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "zustand": "^4.4.1"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.15",
    "eslint": "8.49.0",
    "eslint-config-next": "13.4.19",
    "postcss": "^8.4.29",
    "tailwindcss": "^3.3.3"
  }
}
```

## Implementation Steps

1. **Setup Project Structure**:
   - Create the folder structure as outlined
   - Initialize Next.js project with TypeScript/JavaScript
   - Install required dependencies: DuckDB-WASM, Zustand, Tailwind CSS

2. **Database Implementation**:
   - Implement DuckDB-WASM initialization
   - Create database schema with proper indexes
   - Implement data insertion and query functions

3. **API and Proxy Integration**:
   - Implement server actions for backend communication
   - Implement proxy server communication functions
   - Create data loading functions to populate the database

4. **State Management**:
   - Implement Zustand stores for each content type
   - Create common store for shared state
   - Implement loading states and error handling

5. **Component Development**:
   - Create reusable UI components (Loading, Error)
   - Implement infinite scroll component
   - Build category and stream list components for each content type

6. **Page Implementation**:
   - Create pages for live, movies, and series
   - Implement main layout with navigation
   - Add proper initialization and error handling

7. **Optimization**:
   - Implement lazy loading for images
   - Add debouncing for search functionality
   - Optimize database queries with proper indexing
   - Implement caching strategies

This implementation provides a robust foundation for handling large IPTV playlists efficiently. The use of DuckDB-WASM allows for efficient client-side querying, while the progressive loading strategy ensures that the application remains responsive even with large datasets.