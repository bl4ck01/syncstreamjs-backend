import * as duckdb from '@duckdb/duckdb-wasm';

class DuckDBManager {
  constructor() {
    console.log('[DuckDBManager] 🔧 Constructor called');
    this.initialized = false;
    this.initializing = false;
    this.initPromise = null;
    this.db = null;
    this.connection = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async initialize() {
    console.log('[DuckDBManager] 🚀 initialize() called');
    if (this.initialized) {
      console.log('[DuckDBManager] ✅ Already initialized');
      return true;
    }
    if (this.initializing) {
      console.log('[DuckDBManager] ⏳ Already initializing');
      return this.initPromise;
    }

    console.log('[DuckDBManager] 🔥 Starting initialization...');
    this.initializing = true;
    this.initPromise = this._initializeInternal();
    
    try {
      await this.initPromise;
      this.initialized = true;
      console.log('[DuckDBManager] ✅ Initialization completed successfully');
      return true;
    } catch (error) {
      console.error('[DuckDBManager] ❌ Initialization failed:', error);
      this.initializing = false;
      throw error;
    }
  }

  async _initializeInternal() {
    console.log('[DuckDBManager] 🔧 Internal initialization starting...');
    
    try {
      // Select a bundle based on browser checks
      const bundle = await duckdb.selectBundle({
        mvp: {
          mainModule: '/duckdb-mvp.wasm',
          mainWorker: '/duckdb-mvp.worker.js'
        },
        eh: {
          mainModule: '/duckdb-eh.wasm',
          mainWorker: '/duckdb-eh.worker.js'
        }
      });

      // Create the database worker
      const worker = new Worker(bundle.mainWorker);
      const logger = new duckdb.ConsoleLogger();
      
      // Create the database instance
      this.db = new duckdb.AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      
      // Connect to the database
      this.connection = await this.db.connect();
      
      // Create tables
      await this._createTables();
      await this._createIndexes();
      
      console.log('[DuckDBManager] ✅ DuckDB instance created and connected');
      return true;
    } catch (error) {
      console.error('[DuckDBManager] ❌ Internal initialization failed:', error);
      throw error;
    }
  }

  async _createTables() {
    console.log('[DuckDBManager] 🔧 Creating tables...');
    
    try {
      // Create live_channels table
      await this.connection.query(`
        CREATE TABLE IF NOT EXISTS live_channels (
          id VARCHAR PRIMARY KEY,
          name VARCHAR,
          url VARCHAR,
          category VARCHAR,
          logo VARCHAR,
          epg_id VARCHAR,
          user_agent VARCHAR,
          http_referrer VARCHAR,
          raw TEXT,
          imported_at TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create movies table
      await this.connection.query(`
        CREATE TABLE IF NOT EXISTS movies (
          id VARCHAR PRIMARY KEY,
          name VARCHAR,
          url VARCHAR,
          category VARCHAR,
          logo VARCHAR,
          poster VARCHAR,
          backdrop VARCHAR,
          description TEXT,
          rating VARCHAR,
          director VARCHAR,
          cast TEXT[],
          genre VARCHAR[],
          year INTEGER,
          duration INTEGER,
          raw TEXT,
          imported_at TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create series table
      await this.connection.query(`
        CREATE TABLE IF NOT EXISTS series (
          id VARCHAR PRIMARY KEY,
          name VARCHAR,
          url VARCHAR,
          category VARCHAR,
          logo VARCHAR,
          poster VARCHAR,
          backdrop VARCHAR,
          description TEXT,
          rating VARCHAR,
          genre VARCHAR[],
          year INTEGER,
          season INTEGER,
          episode INTEGER,
          series_id VARCHAR,
          series_name VARCHAR,
          raw TEXT,
          imported_at TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create categories table
      await this.connection.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR UNIQUE,
          content_type VARCHAR,
          channel_count INTEGER DEFAULT 0,
          movie_count INTEGER DEFAULT 0,
          series_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('[DuckDBManager] ✅ Tables created');
    } catch (error) {
      console.error('[DuckDBManager] ❌ Failed to create tables:', error);
      throw error;
    }
  }

  async _createIndexes() {
    console.log('[DuckDBManager] 🔧 Creating indexes...');
    
    try {
      // Create indexes for better query performance
      await this.connection.query(`CREATE INDEX IF NOT EXISTS idx_live_channels_category ON live_channels(category)`);
      await this.connection.query(`CREATE INDEX IF NOT EXISTS idx_live_channels_name ON live_channels(name)`);
      await this.connection.query(`CREATE INDEX IF NOT EXISTS idx_movies_category ON movies(category)`);
      await this.connection.query(`CREATE INDEX IF NOT EXISTS idx_movies_name ON movies(name)`);
      await this.connection.query(`CREATE INDEX IF NOT EXISTS idx_series_category ON series(category)`);
      await this.connection.query(`CREATE INDEX IF NOT EXISTS idx_series_name ON series(name)`);
      await this.connection.query(`CREATE INDEX IF NOT EXISTS idx_series_series_id ON series(series_id)`);
      await this.connection.query(`CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`);
      
      console.log('[DuckDBManager] ✅ Indexes created');
    } catch (error) {
      console.error('[DuckDBManager] ❌ Failed to create indexes:', error);
      throw error;
    }
  }

  // Execute a SQL query with caching
  async query(sql, params = []) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `${sql}:${JSON.stringify(params)}`;
    
    // Check cache first for SELECT queries
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log('[DuckDBManager] 🎯 Cache hit for query');
          return cached.data;
        }
      }
    }

    console.log('[DuckDBManager] 🔍 Executing query:', sql);
    
    try {
      const result = await this.connection.query(sql, params);
      
      // Cache SELECT results
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      console.log(`[DuckDBManager] ✅ Query executed successfully, returned ${result?.length || 1} records`);
      return result;
    } catch (error) {
      console.error('[DuckDBManager] ❌ Query execution failed:', error);
      throw error;
    }
  }

  // Specialized query methods for each content type
  async getLiveChannels(options = {}) {
    const { limit = 100, offset = 0, category = null, search = null, orderBy = 'name' } = options;
    
    let sql = `
      SELECT id, name, url, category, logo, epg_id 
      FROM live_channels 
      WHERE 1=1
    `;
    
    const params = [];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    if (search) {
      sql += ' AND LOWER(name) LIKE ?';
      params.push(`%${search.toLowerCase()}%`);
    }
    
    sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    return this.query(sql, params);
  }

  async getMovies(options = {}) {
    const { limit = 100, offset = 0, category = null, search = null, orderBy = 'name' } = options;
    
    let sql = `
      SELECT id, name, url, category, logo, poster, description, year, duration 
      FROM movies 
      WHERE 1=1
    `;
    
    const params = [];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    if (search) {
      sql += ' AND LOWER(name) LIKE ?';
      params.push(`%${search.toLowerCase()}%`);
    }
    
    sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    return this.query(sql, params);
  }

  async getSeries(options = {}) {
    const { limit = 100, offset = 0, category = null, search = null, orderBy = 'name' } = options;
    
    let sql = `
      SELECT id, name, url, category, logo, poster, description, year, season, episode, series_id, series_name 
      FROM series 
      WHERE 1=1
    `;
    
    const params = [];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    if (search) {
      sql += ' AND LOWER(name) LIKE ?';
      params.push(`%${search.toLowerCase()}%`);
    }
    
    sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    return this.query(sql, params);
  }

  async getCategories(contentType = null) {
    let sql = `
      SELECT DISTINCT c.name, c.content_type, 
             COUNT(lc.id) as channel_count,
             COUNT(m.id) as movie_count,
             COUNT(s.id) as series_count
      FROM categories c
      LEFT JOIN live_channels lc ON c.name = lc.category
      LEFT JOIN movies m ON c.name = m.category
      LEFT JOIN series s ON c.name = s.category
    `;
    
    const params = [];
    
    if (contentType) {
      sql += ' WHERE c.content_type = ?';
      params.push(contentType);
    }
    
    sql += ' GROUP BY c.name, c.content_type ORDER BY c.name';
    
    return this.query(sql, params);
  }

  async getLiveChannelsByCategory(category, options = {}) {
    return this.getLiveChannels({ ...options, category });
  }

  async getMoviesByCategory(category, options = {}) {
    return this.getMovies({ ...options, category });
  }

  async getSeriesByCategory(category, options = {}) {
    return this.getSeries({ ...options, category });
  }

  // Import playlist data into DuckDB
  async importPlaylist(playlist) {
    console.log('[DuckDBManager] 📥 Importing playlist data...');
    
    if (!playlist || !playlist.streams) {
      throw new Error('Invalid playlist data');
    }

    const liveChannels = [];
    const movies = [];
    const series = [];
    const categories = new Map();

    // Categorize streams
    playlist.streams.forEach((stream, index) => {
      const category = stream.category || 'Uncategorized';
      const id = stream.id || stream.url || `stream_${index}`;
      
      if (!categories.has(category)) {
        categories.set(category, {
          name: category,
          contentType: this._determineContentType(stream),
          channel_count: 0,
          movie_count: 0,
          series_count: 0
        });
      }

      const streamData = {
        id,
        name: stream.name || 'Unknown',
        url: stream.url,
        category: category,
        logo: stream.logo,
        raw: JSON.stringify(stream),
        imported_at: new Date().toISOString()
      };

      switch (this._determineContentType(stream)) {
        case 'live':
          liveChannels.push({
            ...streamData,
            epg_id: stream.epg_id,
            user_agent: stream.user_agent,
            http_referrer: stream.http_referrer
          });
          categories.get(category).channel_count++;
          break;
        case 'vod':
          movies.push({
            ...streamData,
            poster: stream.poster,
            backdrop: stream.backdrop,
            description: stream.description,
            rating: stream.rating,
            director: stream.director,
            cast: stream.cast ? JSON.stringify(stream.cast) : null,
            genre: stream.genre ? JSON.stringify(stream.genre) : null,
            year: stream.year ? parseInt(stream.year) : null,
            duration: stream.duration ? parseInt(stream.duration) : null
          });
          categories.get(category).movie_count++;
          break;
        case 'series':
          series.push({
            ...streamData,
            poster: stream.poster,
            backdrop: stream.backdrop,
            description: stream.description,
            rating: stream.rating,
            genre: stream.genre ? JSON.stringify(stream.genre) : null,
            year: stream.year ? parseInt(stream.year) : null,
            season: stream.season ? parseInt(stream.season) : null,
            episode: stream.episode ? parseInt(stream.episode) : null,
            series_id: stream.series_id,
            series_name: stream.series_name
          });
          categories.get(category).series_count++;
          break;
      }
    });

    try {
      // Start a transaction for better performance
      await this.connection.query('BEGIN TRANSACTION');

      // Clear existing data
      await this.connection.query('DELETE FROM live_channels');
      await this.connection.query('DELETE FROM movies');
      await this.connection.query('DELETE FROM series');
      await this.connection.query('DELETE FROM categories');

      // Insert categories
      for (const category of categories.values()) {
        await this.connection.query(`
          INSERT INTO categories (name, content_type, channel_count, movie_count, series_count)
          VALUES (?, ?, ?, ?, ?)
        `, [category.name, category.contentType, category.channel_count, category.movie_count, category.series_count]);
      }

      // Insert live channels
      for (const channel of liveChannels) {
        await this.connection.query(`
          INSERT INTO live_channels (id, name, url, category, logo, epg_id, user_agent, http_referrer, raw, imported_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [channel.id, channel.name, channel.url, channel.category, channel.logo, channel.epg_id, channel.user_agent, channel.http_referrer, channel.raw, channel.imported_at]);
      }

      // Insert movies
      for (const movie of movies) {
        await this.connection.query(`
          INSERT INTO movies (id, name, url, category, logo, poster, backdrop, description, rating, director, cast, genre, year, duration, raw, imported_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [movie.id, movie.name, movie.url, movie.category, movie.logo, movie.poster, movie.backdrop, movie.description, movie.rating, movie.director, movie.cast, movie.genre, movie.year, movie.duration, movie.raw, movie.imported_at]);
      }

      // Insert series
      for (const serie of series) {
        await this.connection.query(`
          INSERT INTO series (id, name, url, category, logo, poster, backdrop, description, rating, genre, year, season, episode, series_id, series_name, raw, imported_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [serie.id, serie.name, serie.url, serie.category, serie.logo, serie.poster, serie.backdrop, serie.description, serie.rating, serie.genre, serie.year, serie.season, serie.episode, serie.series_id, serie.series_name, serie.raw, serie.imported_at]);
      }

      // Commit transaction
      await this.connection.query('COMMIT');

      // Clear cache
      this.cache.clear();

      console.log(`[DuckDBManager] ✅ Imported ${liveChannels.length} live channels, ${movies.length} movies, ${series.length} series, ${categories.size} categories`);
      
      return {
        live: liveChannels.length,
        movies: movies.length,
        series: series.length,
        categories: categories.size
      };
    } catch (error) {
      // Rollback on error
      await this.connection.query('ROLLBACK');
      console.error('[DuckDBManager] ❌ Import failed:', error);
      throw error;
    }
  }

  _determineContentType(stream) {
    const name = (stream.name || '').toLowerCase();
    
    if (name.includes('live') || name.includes('tv') || name.includes('channel')) {
      return 'live';
    }
    
    if (name.includes('series') || name.includes('season') || name.includes('episode') || 
        name.includes('s0') || name.includes('s1') || name.includes('e01') || name.includes('e02')) {
      return 'series';
    }
    
    return 'vod';
  }

  // Get database statistics
  async getStats() {
    const queries = [
      'SELECT COUNT(*) as count FROM live_channels',
      'SELECT COUNT(*) as count FROM movies',
      'SELECT COUNT(*) as count FROM series',
      'SELECT COUNT(*) as count FROM categories',
      'SELECT COUNT(DISTINCT category) as count FROM live_channels',
      'SELECT COUNT(DISTINCT category) as count FROM movies',
      'SELECT COUNT(DISTINCT category) as count FROM series'
    ];

    const results = await Promise.all(queries.map(q => this.query(q)));
    
    return {
      live_channels: results[0][0]?.count || 0,
      movies: results[1][0]?.count || 0,
      series: results[2][0]?.count || 0,
      categories: results[3][0]?.count || 0,
      unique_live_categories: results[4][0]?.count || 0,
      unique_movie_categories: results[5][0]?.count || 0,
      unique_series_categories: results[6][0]?.count || 0
    };
  }

  // Clear all data and cache
  async clearAll() {
    console.log('[DuckDBManager] 🧹 Clearing all data...');
    
    try {
      await this.connection.query('DELETE FROM live_channels');
      await this.connection.query('DELETE FROM movies');
      await this.connection.query('DELETE FROM series');
      await this.connection.query('DELETE FROM categories');
      
      this.cache.clear();
      
      console.log('[DuckDBManager] ✅ All data cleared');
    } catch (error) {
      console.error('[DuckDBManager] ❌ Failed to clear data:', error);
      throw error;
    }
  }

  // Search across all content types
  async searchAll(query, options = {}) {
    const { limit = 50 } = options;
    const searchPattern = `%${query.toLowerCase()}%`;
    
    const [liveResults, movieResults, seriesResults] = await Promise.all([
      this.query(`
        SELECT 'live' as type, id, name, category, logo
        FROM live_channels 
        WHERE LOWER(name) LIKE ? 
        ORDER BY name 
        LIMIT ?
      `, [searchPattern, limit]),
      
      this.query(`
        SELECT 'movie' as type, id, name, category, logo, poster
        FROM movies 
        WHERE LOWER(name) LIKE ? 
        ORDER BY name 
        LIMIT ?
      `, [searchPattern, limit]),
      
      this.query(`
        SELECT 'series' as type, id, name, category, logo, poster, series_name
        FROM series 
        WHERE LOWER(name) LIKE ? 
        ORDER BY name 
        LIMIT ?
      `, [searchPattern, limit])
    ]);

    return {
      live: liveResults,
      movies: movieResults,
      series: seriesResults,
      total: liveResults.length + movieResults.length + seriesResults.length
    };
  }
}

// Export singleton instance
export const duckdbManager = new DuckDBManager();
export default duckdbManager;