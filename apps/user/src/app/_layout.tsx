import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { StatusBar } from 'expo-status-bar';

function NavigationGuard() {
  const segments = useSegments() as any;
  const router = useRouter();
  const { session, initializing } = useAuthStore();
  const { onboardingComplete, initialized: onboardingInitialized } = useOnboardingStore();

  useEffect(() => {
    if (initializing || !onboardingInitialized) return;

    const inTabs = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const inCompanion = segments[0] === 'companion';
    const inBook = segments[0] === 'book';
    const inBookingConfirmation = segments[0] === 'booking-confirmation';
    const inChat = segments[0] === 'chat';
    const inSession = segments[0] === 'session';
    const inRate = segments[0] === 'rate';

    const inValidRoute = inTabs || inOnboarding || 
      inCompanion || inBook || inBookingConfirmation || 
      inChat || inSession || inRate;

    if (!onboardingComplete) {
      // User hasn't completed onboarding — send to welcome if they try to access main app
      if (!inValidRoute) {
        router.replace('/onboarding/welcome');
      }
    } else {
      // Onboarding complete
      if (!session) {
        // Returning user, logged out — send to phone screen
        if (!inValidRoute) {
          router.replace('/onboarding/auth' as any);
        }
      } else {
        // Fully logged in — go to tabs
        if (!inValidRoute) {
          router.replace('/(tabs)/browse');
        }
      }
    }
  }, [session, initializing, onboardingComplete, onboardingInitialized, segments]);

  if (initializing || !onboardingInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="companion/[id]" />
      <Stack.Screen name="book/[id]" />
      <Stack.Screen name="booking-confirmation/[id]" />
      <Stack.Screen name="chat/[bookingId]" />
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="rate/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeOnboarding = useOnboardingStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
    initializeOnboarding();
  }, [initializeAuth, initializeOnboarding]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationGuard />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1923',
  },
});
