import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoSection}>
              <View style={styles.logoIcon}>
                <Ionicons name="people" size={48} color="#FFFFFF" />
              </View>
              <Text style={styles.logoText}>saathi</Text>
            </View>

            {/* Tagline */}
            <View style={styles.taglineSection}>
              <Text style={styles.tagline}>
                Real people. Real company.{'\n'}On demand.
              </Text>
              <Text style={styles.subtext}>
                Find a verified companion for coffee, dinner, movies, city walks and more — across India.
              </Text>
            </View>

            {/* CTA Buttons */}
            <View style={styles.ctaSection}>
              <TouchableOpacity
                style={styles.getStartedBtn}
                activeOpacity={0.9}
                onPress={() => router.push('/onboarding/auth' as any)}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color="#0F1923" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signInLink}
                activeOpacity={0.7}
                onPress={() => router.push('/onboarding/auth' as any)}
              >
                <Text style={styles.signInText}>
                  Already have an account? <Text style={styles.signInBold}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    // Simulated gradient with solid background since LinearGradient may not be installed
    backgroundColor: '#0F1923',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 80,
  },
  logoIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(29, 158, 117, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  taglineSection: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  ctaSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    gap: 8,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F1923',
  },
  signInLink: {
    marginTop: 20,
    padding: 8,
  },
  signInText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  signInBold: {
    fontWeight: '700',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});
