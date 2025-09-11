// Ephemeral — resets on refresh. Holds loading states, errors, scroll positions.
import { create } from 'zustand';

export const useUIStore = create((set) => ({
  isLoading: false,
  errors: {},
  scrollPositions: {}, // { "live_cat1": 1200, ... }
  loadedStreams: {},  // { "live_cat1": [stream1, stream2, ...], ... }

  setLoading: (isLoading) => set({ isLoading }),
  setError: (key, error) => set((state) => ({
    errors: { ...state.errors, [key]: error }
  })),
  setScrollPosition: (key, pos) => set((state) => ({
    scrollPositions: { ...state.scrollPositions, [key]: pos }
  })),
  addLoadedStreams: (key, streams) => set((state) => {
    const existingStreams = state.loadedStreams[key] || [];
    const existingIds = new Set(existingStreams.map(s => s.id || s.stream_id));
    const newUniqueStreams = streams.filter(s => !(s.id || s.stream_id) || !existingIds.has(s.id || s.stream_id));
    
    return {
      loadedStreams: {
        ...state.loadedStreams,
        [key]: [...existingStreams, ...newUniqueStreams]
      }
    };
  }),
  resetCategory: (key) => set((state) => {
    const newLoaded = { ...state.loadedStreams };
    delete newLoaded[key];
    return { loadedStreams: newLoaded };
  }),
}));