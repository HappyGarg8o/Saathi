import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';

export interface UserProfile {
  id: string;
  phone: string;
  email?: string | null;
  name: string | null;
  display_name?: string | null;
  avatar_url: string | null;
  gender: 'male' | 'female' | 'other' | null;
  age?: number | null;
  is_blocked: boolean;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  city?: string | null;
  languages?: string[] | null;
  interests?: string[] | null;
  created_at: string;
}

interface AuthState {
  user: UserProfile | null;
  session: any | null;
  loading: boolean;
  initializing: boolean;
  isNewUser: boolean;
  error: string | null;
  useMockAuth: boolean;
  
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  createProfile: (name: string, gender: 'male' | 'female' | 'other', avatarUrl: string | null, displayName?: string, age?: number, city?: string, languages?: string[], interests?: string[]) => Promise<boolean>;
  updateEmergencyContact: (name: string, phone: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const MOCK_STORAGE_KEY = 'saathi_mock_session';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initializing: true,
  isNewUser: false,
  error: null,
  useMockAuth: process.env.EXPO_PUBLIC_USE_MOCK_AUTH !== 'false', // Default to true for MVP testing

  clearError: () => set({ error: null }),

  initialize: async () => {
    set({ initializing: true, loading: true, error: null });
    try {
      const { useMockAuth } = get();

      if (useMockAuth) {
        // Load mock session from SecureStore if it exists
        const mockSessionStr = await SecureStore.getItemAsync(MOCK_STORAGE_KEY);
        if (mockSessionStr) {
          const parsed = JSON.parse(mockSessionStr);
          set({
            user: parsed.user,
            session: parsed.session,
            isNewUser: !parsed.user.name,
          });
        }
      } else {
        // Check real Supabase Auth session
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          // Fetch user profile from public.users table
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError || !profile) {
            // Logged in but profile is not created yet
            set({
              session,
              user: {
                id: session.user.id,
                phone: session.user.phone || '',
                name: null,
                avatar_url: null,
                gender: null,
                is_blocked: false,
                emergency_contact_name: null,
                emergency_contact_phone: null,
                created_at: new Date().toISOString(),
              },
              isNewUser: true,
            });
          } else {
            set({
              session,
              user: profile as UserProfile,
              isNewUser: false,
            });
          }
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to initialize session' });
    } finally {
      set({ initializing: false, loading: false });
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
        set({ 
          session: data.session,
          user: { 
            id: data.user.id,
            email,
            name,
            phone: '',
            avatar_url: null,
            gender: null,
            is_blocked: false,
            created_at: new Date().toISOString()
          },
          isNewUser: true,
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
      
      set({ 
        session: data.session,
        user: profile || null,
        isNewUser: !profile?.name,
      });
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  createProfile: async (name: string, gender: 'male' | 'female' | 'other', avatarUrl: string | null, displayName?: string, age?: number, city?: string, languages?: string[], interests?: string[]) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth, user, session } = get();
      if (!user) throw new Error('No user session active to create profile');

      const updatedUser: UserProfile = {
        ...user,
        name,
        display_name: displayName || name,
        gender,
        avatar_url: avatarUrl,
        age: age || null,
        city: city || null,
        languages: languages || null,
        interests: interests || null,
      };

      if (useMockAuth) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        const mockFullSession = { user: updatedUser, session };
        await SecureStore.setItemAsync(MOCK_STORAGE_KEY, JSON.stringify(mockFullSession));
        
        set({ user: updatedUser, isNewUser: false });
        return true;
      } else {
        // Upsert user profile into database
        const { error } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            phone: user.phone,
            name,
            gender,
            avatar_url: avatarUrl,
            is_blocked: false,
          });

        if (error) throw error;
        set({ user: updatedUser, isNewUser: false });
        return true;
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to create profile' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  updateEmergencyContact: async (name: string, phone: string) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth, user, session } = get();
      if (!user) throw new Error('No user session active');

      const updatedUser: UserProfile = {
        ...user,
        emergency_contact_name: name,
        emergency_contact_phone: phone,
      };

      if (useMockAuth) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        const mockFullSession = { user: updatedUser, session };
        await SecureStore.setItemAsync(MOCK_STORAGE_KEY, JSON.stringify(mockFullSession));
        
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
        session: null,
        isNewUser: false,
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to sign out' });
    } finally {
      set({ loading: false });
    }
  },
}));
