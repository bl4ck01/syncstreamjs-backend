// Optimized for low-end devices
export const PAGE_SIZE = 15;           // Was 30 — too heavy for low RAM
export const CATEGORY_CHUNK_SIZE = 5;  // Was 10/20 — load fewer, more often
export const CATEGORY_LOAD_THRESHOLD = 2; // Trigger earlier on slow devices
export const STREAM_CACHE_SIZE = 50;   // LRU cache max entries
export const DEBOUNCE_SCROLL = 100;    // ms
export const QUERY_TIMEOUT = 8000;     // ms