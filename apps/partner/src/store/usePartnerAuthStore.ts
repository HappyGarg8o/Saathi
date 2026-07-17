import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';

export interface PartnerProfile {
  id: string;
  phone: string;
  email?: string | null;
  name: string | null;
  avatar_url: string | null;
  gender: 'male' | 'female' | 'other' | null;
  is_blocked: boolean;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  city?: string | null;
  created_at: string;
}

export interface CompanionProfile {
  id: string;
  user_id: string;
  aadhaar_verified: boolean;
  bio: string;
  languages: string[];
  activity_tags: string[];
  hourly_rate: number;
  rating_avg: number;
  total_sessions: number;
  is_active: boolean;
  city: string;
  service_radius_km: number;
}

type OnboardingStage = 'auth' | 'aadhaar' | 'profile_setup' | 'ready';

interface PartnerAuthState {
  user: PartnerProfile | null;
  companion: CompanionProfile | null;
  session: any | null;
  loading: boolean;
  stage: OnboardingStage;
  error: string | null;
  useMockAuth: boolean;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  verifyAadhaar: (aadhaarNumber: string) => Promise<boolean>;
  createCompanionProfile: (data: {
    name: string;
    gender: 'male' | 'female' | 'other';
    bio: string;
    languages: string[];
    activityTags: string[];
    hourlyRate: number;
    photoUri: string | null;
    city: string;
  }) => Promise<boolean>;
  toggleActive: () => Promise<void>;
  updateProfile: (updates: Partial<{
    bio: string;
    languages: string[];
    activityTags: string[];
    hourlyRate: number;
    photoUri: string | null;
  }>) => Promise<boolean>;
  updateEmergencyContact: (name: string, phone: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const MOCK_STORAGE_KEY = 'saathi_partner_mock_session';

function determineStage(user: PartnerProfile | null, companion: CompanionProfile | null): OnboardingStage {
  if (!user) return 'auth';
  if (!companion || !companion.aadhaar_verified) return 'aadhaar';
  if (!companion.bio || !user.name) return 'profile_setup';
  return 'ready';
}

export const usePartnerAuthStore = create<PartnerAuthState>((set, get) => ({
  user: null,
  companion: null,
  session: null,
  loading: false,
  stage: 'auth',
  error: null,
  useMockAuth: process.env.EXPO_PUBLIC_USE_MOCK_AUTH !== 'false',

  clearError: () => set({ error: null }),

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth } = get();

      if (useMockAuth) {
        const stored = await SecureStore.getItemAsync(MOCK_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const stage = determineStage(parsed.user, parsed.companion);
          set({
            user: parsed.user,
            companion: parsed.companion || null,
            session: parsed.session,
            stage,
          });
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const { data: companionData } = await supabase
            .from('companions')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          const userProfile: PartnerProfile = profile ? profile as PartnerProfile : {
            id: session.user.id,
            phone: session.user.phone || '',
            name: null,
            avatar_url: null,
            gender: null,
            is_blocked: false,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            created_at: new Date().toISOString(),
          };

          const comp: CompanionProfile | null = companionData ? {
            ...companionData,
            languages: [],
            activity_tags: [],
          } as CompanionProfile : null;

          const stage = determineStage(userProfile, comp);
          set({ session, user: userProfile, companion: comp, stage });
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to initialize' });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      
      // Create user profile
      if (data.user) {
        await supabase.from('users').insert({
          id: data.user.id,
          email: email,
          name: name,
          phone: '',
          is_blocked: false,
        });

        // Create companion profile
        await supabase.from('companions').insert({
          user_id: data.user.id,
          hourly_rate: 399,
          is_active: false, // needs verification first
          city: 'India',
          service_radius_km: 10,
        });

        const companionData = {
          id: `comp-${data.user.id}`,
          user_id: data.user.id,
          aadhaar_verified: false,
          bio: '',
          languages: [],
          activity_tags: [],
          hourly_rate: 399,
          rating_avg: 5.0,
          total_sessions: 0,
          is_active: false,
          city: 'India',
          service_radius_km: 10,
        };

        const userProfile = {
          id: data.user.id,
          email,
          name,
          phone: '',
          avatar_url: null,
          gender: null,
          is_blocked: false,
          created_at: new Date().toISOString()
        };

        set({ 
          session: data.session,
          user: userProfile,
          companion: companionData,
          stage: 'aadhaar'
        });
      }
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },
  
  signIn: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await 
        supabase.auth.signInWithPassword({
          email,
          password,
        });
      if (error) throw error;
      
      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Fetch companion profile
      const { data: companionData } = await supabase
        .from('companions')
        .select('*')
        .eq('user_id', data.user.id)
        .single();
      
      const userProfile = profile || {
        id: data.user.id,
        email,
        name: null,
        phone: '',
        avatar_url: null,
        gender: null,
        is_blocked: false,
        created_at: new Date().toISOString()
      };

      const compProfile = companionData ? {
        ...companionData,
        languages: companionData.languages || [],
        activity_tags: companionData.activity_tags || [],
      } : null;

      const stage = determineStage(userProfile, compProfile);
      
      set({ 
        session: data.session,
        user: userProfile,
        companion: compProfile,
        stage
      });
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  verifyAadhaar: async (aadhaarNumber: string) => {
    set({ loading: true, error: null });
    try {
      const cleaned = aadhaarNumber.replace(/\s/g, '');
      if (cleaned.length !== 12 || !/^\d+$/.test(cleaned)) {
        throw new Error('Please enter a valid 12-digit Aadhaar number');
      }

      // Simulate DigiLocker verification — 3 second delay
      await new Promise((r) => setTimeout(r, 3000));

      const { useMockAuth, user, session, companion } = get();

      const newCompanion: CompanionProfile = companion || {
        id: `comp-${user?.id}`,
        user_id: user?.id || '',
        aadhaar_verified: false,
        bio: '',
        languages: [],
        activity_tags: [],
        hourly_rate: 299,
        rating_avg: 5.0,
        total_sessions: 0,
        is_active: true,
        city: 'Bangalore',
        service_radius_km: 10,
      };

      newCompanion.aadhaar_verified = true;

      if (useMockAuth) {
        await SecureStore.setItemAsync(
          MOCK_STORAGE_KEY,
          JSON.stringify({ user, companion: newCompanion, session })
        );
      } else {
        await supabase.from('companions').upsert({
          id: newCompanion.id,
          user_id: newCompanion.user_id,
          aadhaar_verified: true,
          hourly_rate: newCompanion.hourly_rate,
        });
      }

      set({ companion: newCompanion, stage: 'profile_setup' });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Aadhaar verification failed' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  createCompanionProfile: async ({ name, gender, bio, languages, activityTags, hourlyRate, photoUri, city }) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth, user, companion, session } = get();
      if (!user || !companion) throw new Error('No active session');

      const updatedUser: PartnerProfile = {
        ...user,
        name,
        gender,
        avatar_url: photoUri || user.avatar_url,
        city: city || user.city,
      };

      const updatedCompanion: CompanionProfile = {
        ...companion,
        bio,
        languages,
        activity_tags: activityTags,
        hourly_rate: hourlyRate,
        is_active: true,
        city: city || companion.city,
        service_radius_km: 10,
        rating_avg: 5.00,
        total_sessions: 0,
      };

      if (useMockAuth) {
        await new Promise((r) => setTimeout(r, 800));
        await SecureStore.setItemAsync(
          MOCK_STORAGE_KEY,
          JSON.stringify({ user: updatedUser, companion: updatedCompanion, session })
        );
      } else {
        await supabase.from('users').upsert({
          id: user.id,
          email: user.email,
          name,
          avatar_url: photoUri,
          gender,
          city,
        });

        await supabase.from('companions').upsert({
          id: companion.id,
          user_id: user.id,
          aadhaar_verified: companion.aadhaar_verified,
          bio,
          hourly_rate: hourlyRate,
          is_active: true,
          city,
          service_radius_km: 10,
          rating_avg: 5.00,
          total_sessions: 0,
        });
      }

      set({
        user: updatedUser,
        companion: updatedCompanion,
        stage: 'ready',
      });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create profile' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  toggleActive: async () => {
    const { companion, useMockAuth, user, session } = get();
    if (!companion) return;

    const updated = { ...companion, is_active: !companion.is_active };

    if (useMockAuth) {
      await SecureStore.setItemAsync(
        MOCK_STORAGE_KEY,
        JSON.stringify({ user, companion: updated, session })
      );
    } else {
      await supabase
        .from('companions')
        .update({ is_active: updated.is_active })
        .eq('id', companion.id);
    }

    set({ companion: updated });
  },

  updateProfile: async (updates) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth, user, companion, session } = get();
      if (!user || !companion) throw new Error('No active session');

      const updatedUser: PartnerProfile = {
        ...user,
        avatar_url: updates.photoUri !== undefined ? updates.photoUri : user.avatar_url,
      };

      const updatedCompanion: CompanionProfile = {
        ...companion,
        bio: updates.bio ?? companion.bio,
        languages: updates.languages ?? companion.languages,
        activity_tags: updates.activityTags ?? companion.activity_tags,
        hourly_rate: updates.hourlyRate ?? companion.hourly_rate,
      };

      if (useMockAuth) {
        await new Promise((r) => setTimeout(r, 500));
        await SecureStore.setItemAsync(
          MOCK_STORAGE_KEY,
          JSON.stringify({ user: updatedUser, companion: updatedCompanion, session })
        );
      } else {
        if (updates.photoUri !== undefined) {
          await supabase.from('users').update({ avatar_url: updates.photoUri }).eq('id', user.id);
        }
        await supabase.from('companions').update({
          bio: updatedCompanion.bio,
          hourly_rate: updatedCompanion.hourly_rate,
        }).eq('id', companion.id);
      }

      set({ user: updatedUser, companion: updatedCompanion });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Update failed' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  updateEmergencyContact: async (name: string, phone: string) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth, user, companion, session } = get();
      if (!user) throw new Error('No user session active');

      const updatedUser: PartnerProfile = {
        ...user,
        emergency_contact_name: name,
        emergency_contact_phone: phone,
      };

      if (useMockAuth) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await SecureStore.setItemAsync(
          MOCK_STORAGE_KEY,
          JSON.stringify({ user: updatedUser, companion, session })
        );
        set({ user: updatedUser });
        return true;
      } else {
        const { error } = await supabase
          .from('users')
          .update({
            emergency_contact_name: name,
            emergency_contact_phone: phone,
          })
          .eq('id', user.id);

        if (error) throw error;
        set({ user: updatedUser });
        return true;
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to update emergency contact' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth } = get();
      if (useMockAuth) {
        await SecureStore.deleteItemAsync(MOCK_STORAGE_KEY);
      } else {
        await supabase.auth.signOut();
      }
      set({
        user: null,
        companion: null,
        session: null,
        stage: 'auth',
      });
    } catch (err: any) {
      set({ error: err.message || 'Sign out failed' });
    } finally {
      set({ loading: false });
    }
  },
}));
