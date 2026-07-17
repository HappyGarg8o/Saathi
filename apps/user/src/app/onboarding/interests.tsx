import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { useAuthStore } from '../../store/useAuthStore';
import { OnboardingHeader } from '../../components/OnboardingHeader';

const ACTIVITIES = [
  { id: 'coffee', emoji: '☕', label: 'Coffee chats' },
  { id: 'dining', emoji: '🍽️', label: 'Dining companion' },
  { id: 'movie', emoji: '🎬', label: 'Movie buddy' },
  { id: 'explore', emoji: '🚶', label: 'City exploration' },
  { id: 'event', emoji: '🎉', label: 'Event plus-one' },
  { id: 'networking', emoji: '💼', label: 'Networking' },
  { id: 'language', emoji: '🗣️', label: 'Practice a language' },
  { id: 'talk', emoji: '🧘', label: 'Just someone to talk to' },
];

export default function InterestsScreen() {
  const router = useRouter();
  const {
    interests, toggleInterest,
    fullName, displayName, avatarUrl,
    gender, age, city, languages,
    completeOnboarding,
  } = useOnboardingStore();
  const { createProfile, loading } = useAuthStore();

  const isValid = interests.length > 0;

  const handleComplete = async () => {
    if (!isValid) return;

    // Save profile to auth store
    const genderValue = gender || 'other';
    const success = await createProfile(
      fullName.trim(),
      genderValue,
      avatarUrl,
      displayName.trim(),
      age ? parseInt(age, 10) : undefined,
      city || undefined,
      languages.length > 0 ? languages : undefined,
      interests,
    );

    if (success) {
      await completeOnboarding();
      router.replace('/(tabs)/browse');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <OnboardingHeader step={5} totalSteps={5} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>What brings you to Saathi?</Text>
          <Text style={styles.subtitle}>Select all that apply</Text>
        </View>

        {/* Activity grid */}
        <View style={styles.activityGrid}>
          {ACTIVITIES.map((activity) => {
            const selected = interests.includes(activity.id);
            return (
              <TouchableOpacity
                key={activity.id}
                style={[styles.activityCard, selected && styles.activityCardSelected]}
                activeOpacity={0.7}
                onPress={() => toggleInterest(activity.id)}
              >
                {selected && (
                  <View style={styles.selectedCheck}>
                    <Ionicons name="checkmark-circle" size={20} color="#1D9E75" />
                  </View>
                )}
                <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                <Text style={[styles.activityLabel, selected && styles.activityLabelSelected]}>
                  {activity.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCta}>
        <TouchableOpacity
          style={[styles.continueBtn, !isValid && styles.continueBtnDisabled]}
          activeOpacity={0.8}
          onPress={handleComplete}
          disabled={!isValid || loading}
        >
          <Text style={styles.continueBtnText}>
            {loading ? 'Setting up...' : "Let's go"}
          </Text>
          {!loading && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100,
  },
  headerCard: {
    backgroundColor: '#0F1923',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityCard: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
  },
  activityCardSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#1D9E75',
    borderWidth: 2,
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  activityEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  activityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  activityLabelSelected: {
    color: '#166534',
    fontWeight: '700',
  },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D9E75',
    borderRadius: 999,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
