# Frontend Debugging Guide

## Issue: Home Page Loading But No Requests Made

### Debugging Steps

1. **Check Browser Console for These Logs:**
   ```
   [HomePage] 🔥 Component rendering
   [HomePage] 📊 Store state: { isInitialized: false, ... }
   [HomePage] 🚀 Component mounted, calling initializeStore...
   [SimplePlaylistStore] 🎯 initializeStore called
   [SimpleDatabaseManager] 🔧 Constructor called
   [SimpleDatabaseManager] 🚀 initialize() called
   [SimpleDatabaseManager] 🔥 Starting initialization...
   [SimpleDatabaseManager] 🔧 Starting internal initialization...
   [SimpleDatabaseManager] 📦 Setting up LocalForage...
   [SimpleDatabaseManager] ✅ LocalForage setup completed
   [SimpleDatabaseManager] 🎉 Database initialized successfully
   [SimplePlaylistStore] 🗄️ Initializing database...
   [SimplePlaylistStore] ✅ Database initialized
   [SimplePlaylistStore] 📂 Loading playlists from database...
   [SimplePlaylistStore] 📋 Found 0 playlists in database
   [SimplePlaylistStore] ✅ Store initialized with 0 playlists
   [HomePage] 🎯 Loading default playlist...
   [SimplePlaylistStore] 🎯 loadDefaultPlaylist called
   ```

2. **Expected Flow:**
   - Store initializes database
   - Loads existing playlists from browser storage
   - If no playlists, tries to load default playlist from server
   - If default playlist exists, fetches data from proxy

3. **Common Issues:**

   **Issue 1: Database initialization fails**
   - Check for `[SimpleDatabaseManager] ❌ Failed to initialize database:` errors
   - Ensure IndexedDB is available in browser
   - Check browser storage permissions

   **Issue 2: No default playlist configured**
   - Look for: `No default playlist set`
   - User needs to configure a default playlist in their profile

   **Issue 3: Server actions failing**
   - Check for errors in `getCurrentProfileWithPlaylist` or `getPlaylistAction`
   - Ensure server-side functions are working

   **Issue 4: Proxy requests not being made**
   - Look for `[SimplePlaylistStore] Loading:` logs
   - Check if `loadPlaylistData` is being called
   - Verify proxy server is running on port 8081

### Key Files to Check:

1. **`/src/store/simple-playlist.js`** - Main store logic
2. **`/src/lib/simple-database.js`** - Database management
3. **`/src/components/home-page-optimized.jsx`** - Home page component
4. **`/src/lib/proxy.js`** - Proxy server communication

### Expected Network Requests:

1. **Server Actions:** `/api/actions` (for profile data)
2. **Proxy Server:** `http://localhost:8081/get` (for playlist data)

### If Still Stuck:

1. **Check browser storage:**
   - Open DevTools > Application > Local Storage / IndexedDB
   - Look for `playlist-store` data

2. **Check proxy server:**
   - Ensure proxy is running: `cd proxy && go run ./proxy`
   - Test proxy directly: `http://localhost:8081/health`

3. **Check server actions:**
   - Verify server-side functions are properly exported
   - Check for server errors in logs

### Temporary Fallback:

If the optimized version continues to have issues, you can temporarily revert to the original implementation:

```javascript
// In /src/app/(app)/page.js:
// import CategoryHomeLayout from '@/components/category-home-layout';
// return <CategoryHomeLayout />;
```

This will help isolate whether the issue is with the new optimization or the existing system.