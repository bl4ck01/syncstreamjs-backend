// Persists across refresh — avoids re-downloading 200MB
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useMetadataStore = create(
  persist(
    (set) => ({
      user: null,
      playlist: null,
      categories: {
        live: [],
        movie: [],
        series: [],
      },
      categoryCounts: {}, // { "live_cat1": 1200, ... }

      setUser: (user) => set({ user }),
      setPlaylist: (playlist) => set({ playlist }),
      setCategories: (type, categories) => set((state) => ({
        categories: { ...state.categories, [type]: categories }
      })),
      setCategoryCount: (key, count) => set((state) => ({
        categoryCounts: { ...state.categoryCounts, [key]: count }
      })),
    }),
    { name: 'iptv-metadata' }
  )
);