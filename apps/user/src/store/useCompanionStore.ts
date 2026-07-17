import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Companion {
  id: string;
  user_id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  avatar_url: string;
  aadhaar_verified: boolean;
  bio: string;
  hourly_rate: number;
  rating_avg: number;
  total_sessions: number;
  is_active: boolean;
  city: string;
  service_radius_km: number;
  activity_tags: string[];
}

interface CompanionFilters {
  gender: 'all' | 'male' | 'female' | 'other';
  activity: 'all' | 'Coffee' | 'Dinner' | 'Movie' | 'City Walk' | 'Event Plus-One' | 'Custom';
  availabilityToday: boolean;
  maxPrice: number;
}

interface CompanionState {
  companions: Companion[];
  filteredCompanions: Companion[];
  filters: CompanionFilters;
  loading: boolean;
  error: string | null;
  
  setFilter: <K extends keyof CompanionFilters>(key: K, value: CompanionFilters[K]) => void;
  resetFilters: () => void;
  fetchCompanions: () => Promise<void>;
}

const DEFAULT_FILTERS: CompanionFilters = {
  gender: 'all',
  activity: 'all',
  availabilityToday: false,
  maxPrice: 2000,
};

export const useCompanionStore = create<CompanionState>((set, get) => ({
  companions: [],
  filteredCompanions: [],
  filters: DEFAULT_FILTERS,
  loading: false,
  error: null,

  setFilter: (key, value) => {
    set((state) => {
      const newFilters = { ...state.filters, [key]: value };
      const filtered = applyFilters(state.companions, newFilters);
      return { filters: newFilters, filteredCompanions: filtered };
    });
  },

  resetFilters: () => {
    set((state) => {
      const filtered = applyFilters(state.companions, DEFAULT_FILTERS);
      return { filters: DEFAULT_FILTERS, filteredCompanions: filtered };
    });
  },

  fetchCompanions: async () => {
    set({ loading: true, error: null });
    try {
      // Query Supabase joined with user details
      const { data, error } = await supabase
        .from('companions')
        .select(`
          id,
          user_id,
          aadhaar_verified,
          bio,
          hourly_rate,
          rating_avg,
          total_sessions,
          is_active,
          city,
          service_radius_km,
          users (
            name,
            avatar_url,
            gender
          )
        `)
        .eq('is_active', true);

      if (error) throw error;

      const formatted: Companion[] = (data || []).map((item: any) => {
        const tags = item.activity_tags || item.activities || ['Coffee', 'Dinner'];
        return {
          id: item.id,
          user_id: item.user_id,
          name: item.users?.name || 'Anonymous',
          gender: item.users?.gender || 'other',
          avatar_url: item.users?.avatar_url || 'https://via.placeholder.com/150',
          aadhaar_verified: item.aadhaar_verified,
          bio: item.bio || '',
          hourly_rate: item.hourly_rate,
          rating_avg: parseFloat(item.rating_avg || '5.0'),
          total_sessions: item.total_sessions || 0,
          is_active: item.is_active,
          city: item.city || 'India',
          service_radius_km: item.service_radius_km || 10,
          activity_tags: tags,
        };
      });

      set({
        companions: formatted,
        filteredCompanions: applyFilters(formatted, get().filters),
      });
    } catch (err: any) {
      set({
        error: err.message || 'Failed to fetch companions',
        companions: [],
        filteredCompanions: [],
      });
    } finally {
      set({ loading: false });
    }
  },
}));

function applyFilters(companions: Companion[], filters: CompanionFilters): Companion[] {
  return companions.filter((companion) => {
    // 1. Gender filter
    if (filters.gender !== 'all' && companion.gender !== filters.gender) {
      return false;
    }

    // 2. Activity filter
    if (filters.activity !== 'all' && !companion.activity_tags.includes(filters.activity)) {
      return false;
    }

    // 3. Max price filter
    if (companion.hourly_rate > filters.maxPrice) {
      return false;
    }

    // 4. Availability today (For MVP mock simplicity, we allow all if checked, or filter active)
    if (filters.availabilityToday && !companion.is_active) {
      return false;
    }

    return true;
  });
}
