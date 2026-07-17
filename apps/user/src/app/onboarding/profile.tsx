import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { OnboardingHeader } from '../../components/OnboardingHeader';

const AVATAR_OPTIONS = [
  { id: 'a1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&fit=crop' },
  { id: 'a2', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&fit=crop' },
  { id: 'a3', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&fit=crop' },
  { id: 'a4', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&fit=crop' },
  { id: 'a5', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&fit=crop' },
  { id: 'a6', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&fit=crop' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { fullName, displayName, avatarUrl, setFullName, setDisplayName, setAvatarUrl } =
    useOnboardingStore();
  const params = useLocalSearchParams<{ name?: string; email?: string }>();
  const initialName = params.name || '';

  React.useEffect(() => {
    if (initialName) {
      if (!fullName) {
        setFullName(initialName);
      }
      if (!displayName) {
        const firstWord = initialName.trim().split(/\s+/)[0];
        setDisplayName(firstWord);
      }
    }
  }, [initialName]);

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const isValid = fullName.trim().length >= 2 && displayName.trim().length >= 2;

  const handleContinue = () => {
    if (!isValid) return;
    router.push('/onboarding/about');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <OnboardingHeader step={3} totalSteps={5} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerCard}>
            <Text style={styles.title}>Let's set up your profile</Text>
            <Text style={styles.subtitle}>This helps companions recognize you</Text>
          </View>

          {/* Photo upload area */}
          <TouchableOpacity
            style={styles.photoArea}
            activeOpacity={0.8}
            onPress={() => setShowAvatarPicker(!showAvatarPicker)}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.selectedPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera" size={32} color="#9CA3AF" />
              </View>
            )}
            <Text style={styles.photoLabel}>
              {avatarUrl ? 'Tap to change' : 'Add your photo'}
            </Text>
          </TouchableOpacity>

          {/* Avatar picker grid */}
          {showAvatarPicker && (
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setAvatarUrl(item.url);
                    setShowAvatarPicker(false);
                  }}
                  style={[
                    styles.avatarOption,
                    avatarUrl === item.url && styles.avatarOptionSelected,
                  ]}
                >
                  <Image source={{ uri: item.url }} style={styles.avatarImg} />
                  {avatarUrl === item.url && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Name inputs */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[styles.textInput, !!initialName && styles.readOnlyInput]}
              placeholder="E.g., Arjun Mehta"
              placeholderTextColor="#D1D5DB"
              value={fullName}
              onChangeText={setFullName}
              maxLength={40}
              autoCapitalize="words"
              editable={!initialName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="E.g., Arjun"
              placeholderTextColor="#D1D5DB"
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={20}
              autoCapitalize="words"
            />
            <Text style={styles.inputHelper}>This is what companions will see</Text>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomCta}>
          <TouchableOpacity
            style={[styles.continueBtn, !isValid && styles.continueBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleContinue}
            disabled={!isValid}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
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
  photoArea: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  selectedPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#1D9E75',
  },
  photoLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '500',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
    position: 'relative',
  },
  avatarOptionSelected: {
    borderColor: '#1D9E75',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1D9E75',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  readOnlyInput: {
    backgroundColor: '#E5E7EB',
    color: '#6B7280',
  },
  inputHelper: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
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
