import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { usePartnerAuthStore } from '../store/usePartnerAuthStore';
import { StatusBar } from 'expo-status-bar';

function NavigationGuard() {
  const segments = useSegments() as any;
  const router = useRouter();
  const { session, stage, loading } = usePartnerAuthStore();

  useEffect(() => {
    if (loading) return;

    const inTabs = segments[0] === '(tabs)';
    const inAadhaar = segments[0] === 'aadhaar-verify';
    const inProfileSetup = segments[0] === 'profile-setup';
    const inSession = segments[0] === 'session';
    const inChat = segments[0] === 'chat';
    const inRate = segments[0] === 'rate';
    const isAuthScreen = segments[0] === 'index' || segments.length === 0;

    const inOnboarding = segments[0] === 'onboarding' 
      || segments[0] === 'index'
      || segments[0] === 'aadhaar-verify'
      || segments[0] === 'profile-setup';

    const inValidRoute = inTabs || inOnboarding || 
      inSession || inChat || inRate;

    if (stage === 'auth') {
      if (!isAuthScreen) {
        router.replace('/');
      }
    } else if (stage === 'aadhaar') {
      if (!inAadhaar) {
        router.replace('/aadhaar-verify');
      }
    } else if (stage === 'profile_setup') {
      if (!inProfileSetup) {
        router.replace('/profile-setup');
      }
    } else if (stage === 'ready') {
      if (!inValidRoute) {
        router.replace('/(tabs)/requests');
      }
    }
  }, [session, stage, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="aadhaar-verify" options={{ headerShown: false }} />
      <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="chat/[bookingId]" />
      <Stack.Screen name="rate/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  const initialize = usePartnerAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationGuard />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
