import localforage from 'localforage';

class SQLDatabaseManager {
  constructor() {
    console.log('[SQLDatabaseManager] 🔧 Constructor called');
    this.initialized = false;
    this.initializing = false;
    this.initPromise = null;
    this.db = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async initialize() {
    console.log('[SQLDatabaseManager] 🚀 initialize() called');
    if (this.initialized) {
      console.log('[SQLDatabaseManager] ✅ Already initialized');
      return true;
    }
    if (this.initializing) {
      console.log('[SQLDatabaseManager] ⏳ Already initializing');
      return this.initPromise;
    }

    console.log('[SQLDatabaseManager] 🔥 Starting initialization...');
    this.initializing = true;
    this.initPromise = this._initializeInternal();
    
    try {
      await this.initPromise;
      this.initialized = true;
      console.log('[SQLDatabaseManager] ✅ Initialization completed successfully');
      return true;
    } catch (error) {
      console.error('[SQLDatabaseManager] ❌ Initialization failed:', error);
      this.initializing = false;
      throw error;
    }
  }

  async _initializeInternal() {
    console.log('[SQLDatabaseManager] 🔧 Internal initialization starting...');
    
    try {
      // Initialize localForage instances for different content types
      this.liveStore = localforage.createInstance({
        name: 'syncstream_live_db',
        storeName: 'live_streams',
        description: 'Live TV channels database'
      });

      this.moviesStore = localforage.createInstance({
        name: 'syncstream_movies_db', 
        storeName: 'movies_streams',
        description: 'Movies/VOD database'
      });

      this.seriesStore = localforage.createInstance({
        name: 'syncstream_series_db',
        storeName: 'series_streams', 
        description: 'Series database'
      });

      this.metaStore = localforage.createInstance({
        name: 'syncstream_meta_db',
        storeName: 'metadata',
        description: 'Metadata and indexes'
      });

      // Create indexes for faster queries
      await this._createIndexes();
      
      console.log('[SQLDatabaseManager] ✅ Database instances created');
      return true;
    } catch (error) {
      console.error('[SQLDatabaseManager] ❌ Internal initialization failed:', error);
      throw error;
    }
  }

  async _createIndexes() {
    console.log('[SQLDatabaseManager] 🔧 Creating indexes...');
    
    // Create category indexes
    await this.metaStore.setItem('categories_index', new Map());
    await this.metaStore.setItem('search_index', new Map());
    
    console.log('[SQLDatabaseManager] ✅ Indexes created');
  }

  // Execute a "SQL-like" query on the data
  async query(storeType, query, params = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `${storeType}:${JSON.stringify(query)}:${JSON.stringify(params)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`[SQLDatabaseManager] 🎯 Cache hit for ${storeType}`);
        return cached.data;
      }
    }

    console.log(`[SQLDatabaseManager] 🔍 Executing query on ${storeType}:`, query);
    
    let store;
    switch (storeType) {
      case 'live':
        store = this.liveStore;
        break;
      case 'movies':
        store = this.moviesStore;
        break;
      case 'series':
        store = this.seriesStore;
        break;
      case 'meta':
        store = this.metaStore;
        break;
      default:
        throw new Error(`Unknown store type: ${storeType}`);
    }

    try {
      let result;
      
      if (query.type === 'SELECT') {
        result = await this._executeSelect(store, query, params);
      } else if (query.type === 'INSERT') {
        result = await this._executeInsert(store, query, params);
      } else if (query.type === 'UPDATE') {
        result = await this._executeUpdate(store, query, params);
      } else if (query.type === 'DELETE') {
        result = await this._executeDelete(store, query, params);
      } else {
        throw new Error(`Unknown query type: ${query.type}`);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      console.log(`[SQLDatabaseManager] ✅ Query executed successfully, returned ${result.length || 1} records`);
      return result;
    } catch (error) {
      console.error(`[SQLDatabaseManager] ❌ Query execution failed:`, error);
      throw error;
    }
  }

  async _executeSelect(store, query, params) {
    const { from, where, orderBy, limit, offset, groupBy } = query;
    
    // Get all data from the store
    let data = await store.getItem(from) || [];
    
    if (!Array.isArray(data)) {
      data = [];
    }

    // Apply WHERE filters
    if (where) {
      data = data.filter(item => this._evaluateWhere(item, where, params));
    }

    // Apply GROUP BY
    if (groupBy) {
      const groups = new Map();
      data.forEach(item => {
        const key = item[groupBy];
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(item);
      });
      
      data = Array.from(groups.entries()).map(([key, items]) => ({
        [groupBy]: key,
        items: items,
        count: items.length
      }));
    }

    // Apply ORDER BY
    if (orderBy) {
      const { field, direction = 'ASC' } = orderBy;
      data.sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        
        if (direction === 'ASC') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });
    }

    // Apply LIMIT and OFFSET
    if (offset || limit) {
      const start = offset || 0;
      const end = limit ? start + limit : undefined;
      data = data.slice(start, end);
    }

    return data;
  }

  _evaluateWhere(item, where, params) {
    for (const [field, condition] of Object.entries(where)) {
      const value = item[field];
      
      if (typeof condition === 'object') {
        // Handle operators
        for (const [op, condValue] of Object.entries(condition)) {
          switch (op) {
            case 'eq':
              if (value !== condValue) return false;
              break;
            case 'ne':
              if (value === condValue) return false;
              break;
            case 'like':
              if (typeof value !== 'string' || !value.toLowerCase().includes(condValue.toLowerCase())) return false;
              break;
            case 'gt':
              if (value <= condValue) return false;
              break;
            case 'lt':
              if (value >= condValue) return false;
              break;
            case 'in':
              if (!Array.isArray(condValue) || !condValue.includes(value)) return false;
              break;
          }
        }
      } else {
        // Simple equality
        if (value !== condition) return false;
      }
    }
    
    return true;
  }

  async _executeInsert(store, query, params) {
    const { into, values } = query;
    
    let data = await store.getItem(into) || [];
    if (!Array.isArray(data)) {
      data = [];
    }

    const newRecord = { ...values, id: Date.now().toString() };
    data.push(newRecord);
    
    await store.setItem(into, data);
    
    // Clear cache for this table
    this._clearCacheForTable(into);
    
    return newRecord;
  }

  async _executeUpdate(store, query, params) {
    const { set, where } = query;
    
    let data = await store.getItem(set.table) || [];
    if (!Array.isArray(data)) {
      data = [];
    }

    const updatedRecords = [];
    data = data.map(item => {
      if (this._evaluateWhere(item, where, params)) {
        const updated = { ...item, ...set.values };
        updatedRecords.push(updated);
        return updated;
      }
      return item;
    });

    await store.setItem(set.table, data);
    
    // Clear cache for this table
    this._clearCacheForTable(set.table);
    
    return updatedRecords;
  }

  async _executeDelete(store, query, params) {
    const { from, where } = query;
    
    let data = await store.getItem(from) || [];
    if (!Array.isArray(data)) {
      data = [];
    }

    const deletedRecords = [];
    data = data.filter(item => {
      if (this._evaluateWhere(item, where, params)) {
        deletedRecords.push(item);
        return false;
      }
      return true;
    });

    await store.setItem(from, data);
    
    // Clear cache for this table
    this._clearCacheForTable(from);
    
    return deletedRecords;
  }

  _clearCacheForTable(table) {
    for (const [key] of this.cache) {
      if (key.startsWith(table)) {
        this.cache.delete(key);
      }
    }
  }

  // specialized query methods for each content type
  async getLiveChannels(options = {}) {
    const { limit = 100, offset = 0, category = null, search = null } = options;
    
    const query = {
      type: 'SELECT',
      from: 'channels',
      where: {
        type: { eq: 'live' }
      },
      orderBy: { field: 'name', direction: 'ASC' },
      limit,
      offset
    };

    if (category) {
      query.where.category = { eq: category };
    }

    if (search) {
      query.where.name = { like: search };
    }

    return this.query('live', query);
  }

  async getMovies(options = {}) {
    const { limit = 100, offset = 0, category = null, search = null } = options;
    
    const query = {
      type: 'SELECT',
      from: 'movies',
      where: {
        type: { eq: 'vod' }
      },
      orderBy: { field: 'name', direction: 'ASC' },
      limit,
      offset
    };

    if (category) {
      query.where.category = { eq: category };
    }

    if (search) {
      query.where.name = { like: search };
    }

    return this.query('movies', query);
  }

  async getSeries(options = {}) {
    const { limit = 100, offset = 0, category = null, search = null } = options;
    
    const query = {
      type: 'SELECT',
      from: 'series',
      where: {
        type: { eq: 'series' }
      },
      orderBy: { field: 'name', direction: 'ASC' },
      limit,
      offset
    };

    if (category) {
      query.where.category = { eq: category };
    }

    if (search) {
      query.where.name = { like: search };
    }

    return this.query('series', query);
  }

  async getCategories(contentType) {
    const query = {
      type: 'SELECT',
      from: 'categories',
      where: {
        contentType: { eq: contentType }
      },
      orderBy: { field: 'name', direction: 'ASC' }
    };

    return this.query('meta', query);
  }

  // Clear all data and cache
  async clearAll() {
    console.log('[SQLDatabaseManager] 🧹 Clearing all data...');
    
    await this.liveStore.clear();
    await this.moviesStore.clear();
    await this.seriesStore.clear();
    await this.metaStore.clear();
    
    this.cache.clear();
    
    console.log('[SQLDatabaseManager] ✅ All data cleared');
  }

  // Import playlist data into the SQL database
  async importPlaylist(playlist) {
    console.log('[SQLDatabaseManager] 📥 Importing playlist data...');
    
    if (!playlist || !playlist.streams) {
      throw new Error('Invalid playlist data');
    }

    const liveChannels = [];
    const movies = [];
    const series = [];
    const categories = new Map();

    // Categorize streams
    playlist.streams.forEach(stream => {
      const category = stream.category || 'Uncategorized';
      
      if (!categories.has(category)) {
        categories.set(category, {
          name: category,
          contentType: this._determineContentType(stream),
          count: 0
        });
      }
      categories.get(category).count++;

      const streamData = {
        ...stream,
        id: stream.id || stream.url,
        category: category,
        importedAt: Date.now()
      };

      switch (this._determineContentType(stream)) {
        case 'live':
          liveChannels.push(streamData);
          break;
        case 'vod':
          movies.push(streamData);
          break;
        case 'series':
          series.push(streamData);
          break;
      }
    });

    // Save data to respective stores
    await this.liveStore.setItem('channels', liveChannels);
    await this.moviesStore.setItem('movies', movies);
    await this.seriesStore.setItem('series', series);
    
    // Save categories
    await this.metaStore.setItem('categories', Array.from(categories.values()));

    // Clear cache
    this.cache.clear();

    console.log(`[SQLDatabaseManager] ✅ Imported ${liveChannels.length} live channels, ${movies.length} movies, ${series.length} series`);
    
    return {
      live: liveChannels.length,
      movies: movies.length,
      series: series.length,
      categories: categories.size
    };
  }

  _determineContentType(stream) {
    if (stream.name?.toLowerCase().includes('live') || 
        stream.name?.toLowerCase().includes('tv') ||
        stream.name?.toLowerCase().includes('channel')) {
      return 'live';
    }
    
    if (stream.name?.toLowerCase().includes('series') ||
        stream.name?.toLowerCase().includes('season') ||
        stream.name?.toLowerCase().includes('episode')) {
      return 'series';
    }
    
    return 'vod';
  }
}

// Export singleton instance
export const sqlDatabaseManager = new SQLDatabaseManager();
export default sqlDatabaseManager;