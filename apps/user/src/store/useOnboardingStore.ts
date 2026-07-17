import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

export interface OnboardingState {
  // Flow control
  step: number;
  onboardingComplete: boolean;
  initialized: boolean;

  // Screen 2: Phone (handled by authStore, just tracked here)
  phone: string;

  // Screen 4: Profile
  fullName: string;
  displayName: string;
  avatarUrl: string | null;

  // Screen 5: About
  gender: 'male' | 'female' | 'other' | null;
  age: string;
  city: string;
  languages: string[];

  // Screen 6: Interests
  interests: string[];

  // Actions
  initialize: () => Promise<void>;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPhone: (phone: string) => void;
  setFullName: (name: string) => void;
  setDisplayName: (name: string) => void;
  setAvatarUrl: (url: string | null) => void;
  setGender: (gender: 'male' | 'female' | 'other' | null) => void;
  setAge: (age: string) => void;
  setCity: (city: string) => void;
  toggleLanguage: (language: string) => void;
  toggleInterest: (interest: string) => void;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  step: 1,
  onboardingComplete: false,
  initialized: false,

  phone: '',
  fullName: '',
  displayName: '',
  avatarUrl: null,

  gender: null,
  age: '',
  city: '',
  languages: [],

  interests: [],

  initialize: async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
      set({
        onboardingComplete: value === 'true',
        initialized: true,
      });
    } catch {
      set({ onboardingComplete: false, initialized: true });
    }
  },

  setStep: (step) => set({ step }),
  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 6) })),
  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),

  setPhone: (phone) => set({ phone }),
  setFullName: (fullName) => set({ fullName }),
  setDisplayName: (displayName) => set({ displayName }),
  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
  setGender: (gender) => set({ gender }),
  setAge: (age) => set({ age }),
  setCity: (city) => set({ city }),

  toggleLanguage: (language) =>
    set((state) => ({
      languages: state.languages.includes(language)
        ? state.languages.filter((l) => l !== language)
        : [...state.languages, language],
    })),

  toggleInterest: (interest) =>
    set((state) => ({
      interests: state.interests.includes(interest)
        ? state.interests.filter((i) => i !== interest)
        : [...state.interests, interest],
    })),

  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
      set({ onboardingComplete: true });
    } catch (err) {
      console.error('Failed to save onboarding state:', err);
    }
  },

  resetOnboarding: async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
      set({
        step: 1,
        onboardingComplete: false,
        phone: '',
        fullName: '',
        displayName: '',
        avatarUrl: null,
        gender: null,
        age: '',
        city: '',
        languages: [],
        interests: [],
      });
    } catch (err) {
      console.error('Failed to reset onboarding state:', err);
    }
  },
}));
