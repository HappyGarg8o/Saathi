import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePartnerAuthStore } from '../store/usePartnerAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@saathi/ui';
import { useRouter } from 'expo-router';

const LANGUAGES = [
  'English', 'Hindi', 'Kannada', 'Tamil', 'Telugu',
  'Malayalam', 'Bengali', 'Marathi', 'Punjabi',
];

const ACTIVITIES = [
  { label: 'Coffee', icon: 'cafe-outline' as const },
  { label: 'Dinner', icon: 'restaurant-outline' as const },
  { label: 'Movie', icon: 'film-outline' as const },
  { label: 'City Walk', icon: 'walk-outline' as const },
  { label: 'Event Plus-One', icon: 'people-outline' as const },
  { label: 'Custom', icon: 'sparkles-outline' as const },
];

export default function ProfileSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createCompanionProfile, loading, error, clearError, user } = usePartnerAuthStore();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [bio, setBio] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState(299);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
    if (user?.city && !city) {
      setCity(user.city);
    }
  }, [user]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [step]);

  const goNext = () => {
    slideAnim.setValue(50);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    slideAnim.setValue(-50);
    setStep((s) => s - 1);
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const toggleActivity = (act: string) => {
    setSelectedActivities((prev) =>
      prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]
    );
  };

  const showPhotoOptions = () => {
    Alert.alert('Coming Soon', 'Photo upload will be available in the next update.');
  };

  const handleSubmit = async () => {
    clearError();
    if (!name || !gender || !bio || !city || selectedActivities.length === 0) {
      Alert.alert('Incomplete', 'Please fill in all required fields.');
      return;
    }
    const success = await createCompanionProfile({
      name,
      gender,
      bio,
      languages: selectedLanguages,
      activityTags: selectedActivities,
      hourlyRate,
      photoUri,
      city,
    });
    if (success) {
      router.replace('/(tabs)/requests');
    }
  };

  const RATE_PRESETS = [299, 399, 499, 599, 799, 999, 1500, 2000];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[styles.progressDot, step >= s && styles.progressDotActive]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {/* STEP 1: About You */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepLabel}>STEP 1 OF 3</Text>
              <Text style={styles.stepTitle}>About You</Text>
              <Text style={styles.stepSubtitle}>
                Tell users who you are. A great profile gets more bookings.
              </Text>

              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput
                  style={[styles.textInput, !!user?.name && styles.readOnlyInput]}
                  placeholder="Your name as shown to users"
                  placeholderTextColor="#A0AEC0"
                  value={name}
                  onChangeText={setName}
                  maxLength={50}
                  editable={!user?.name}
                />
              </View>

              {/* City */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>City *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Your current city (e.g. Bangalore)"
                  placeholderTextColor="#A0AEC0"
                  value={city}
                  onChangeText={setCity}
                  maxLength={50}
                />
              </View>

              {/* Gender */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Gender *</Text>
                <View style={styles.chipRow}>
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <Pressable
                      key={g}
                      style={[styles.chip, gender === g && styles.chipSelected]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[styles.chipText, gender === g && styles.chipTextSelected]}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Bio */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Bio *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe yourself, your interests, and what makes you a great companion..."
                  placeholderTextColor="#A0AEC0"
                  value={bio}
                  onChangeText={setBio}
                  maxLength={300}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{bio.length}/300</Text>
              </View>

              {/* Languages */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Languages</Text>
                <View style={styles.chipRow}>
                  {LANGUAGES.map((lang) => (
                    <Pressable
                      key={lang}
                      style={[styles.chip, selectedLanguages.includes(lang) && styles.chipSelected]}
                      onPress={() => toggleLanguage(lang)}
                    >
                      <Text style={[styles.chipText, selectedLanguages.includes(lang) && styles.chipTextSelected]}>
                        {lang}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <Button
                title="Continue"
                onPress={goNext}
                disabled={!name || !gender || !bio || !city}
                variant="primary"
                style={{
                  backgroundColor: name && gender && bio && city ? '#534AB7' : '#CBD5E0',
                  marginTop: 24,
                }}
              />
            </View>
          )}

          {/* STEP 2: Services & Rate */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepLabel}>STEP 2 OF 3</Text>
              <Text style={styles.stepTitle}>Your Services</Text>
              <Text style={styles.stepSubtitle}>
                Choose activities you're open to and set your hourly rate.
              </Text>

              {/* Activities */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Activities You Offer *</Text>
                <View style={styles.activityGrid}>
                  {ACTIVITIES.map((act) => (
                    <Pressable
                      key={act.label}
                      style={[
                        styles.activityCard,
                        selectedActivities.includes(act.label) && styles.activityCardSelected,
                      ]}
                      onPress={() => toggleActivity(act.label)}
                    >
                      <Ionicons
                        name={act.icon}
                        size={24}
                        color={selectedActivities.includes(act.label) ? '#534AB7' : '#718096'}
                      />
                      <Text
                        style={[
                          styles.activityLabel,
                          selectedActivities.includes(act.label) && styles.activityLabelSelected,
                        ]}
                      >
                        {act.label}
                      </Text>
                      {selectedActivities.includes(act.label) && (
                        <View style={styles.checkBadge}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Hourly Rate */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Hourly Rate</Text>
                <View style={styles.rateDisplay}>
                  <Text style={styles.rateCurrency}>₹</Text>
                  <Text style={styles.rateAmount}>{hourlyRate}</Text>
                  <Text style={styles.rateUnit}>/hour</Text>
                </View>
                <View style={styles.ratePresets}>
                  {RATE_PRESETS.map((rate) => (
                    <Pressable
                      key={rate}
                      style={[styles.rateChip, hourlyRate === rate && styles.rateChipSelected]}
                      onPress={() => setHourlyRate(rate)}
                    >
                      <Text
                        style={[styles.rateChipText, hourlyRate === rate && styles.rateChipTextSelected]}
                      >
                        ₹{rate}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.rateHint}>
                  You earn 75% = ₹{Math.round(hourlyRate * 0.75)}/hr. Platform keeps 25%.
                </Text>
              </View>

              <View style={styles.btnRow}>
                <Pressable style={styles.backButton} onPress={goBack}>
                  <Ionicons name="arrow-back" size={20} color="#534AB7" />
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Continue"
                    onPress={goNext}
                    disabled={selectedActivities.length === 0}
                    variant="primary"
                    style={{
                      backgroundColor: selectedActivities.length > 0 ? '#534AB7' : '#CBD5E0',
                    }}
                  />
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: Profile Photo */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepLabel}>STEP 3 OF 3</Text>
              <Text style={styles.stepTitle}>Profile Photo</Text>
              <Text style={styles.stepSubtitle}>
                Add a clear, recent photo of yourself. Users see this before booking.
              </Text>

              <Pressable style={styles.photoPickerContainer} onPress={showPhotoOptions}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera" size={40} color="#534AB7" />
                    <Text style={styles.photoPlaceholderText}>Tap to add your photo</Text>
                    <Text style={styles.photoPlaceholderHint}>Camera or Gallery</Text>
                  </View>
                )}

                {photoUri && (
                  <View style={styles.changePhotoOverlay}>
                    <Ionicons name="camera" size={20} color="#FFFFFF" />
                    <Text style={styles.changePhotoText}>Change</Text>
                  </View>
                )}
              </Pressable>

              <View style={styles.photoTips}>
                <Text style={styles.photoTipTitle}>Photo Tips</Text>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#38A169" />
                  <Text style={styles.tipText}>Clear face photo (no sunglasses)</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#38A169" />
                  <Text style={styles.tipText}>Recent photo (within 6 months)</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#38A169" />
                  <Text style={styles.tipText}>Good lighting, friendly expression</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="close-circle" size={16} color="#E53E3E" />
                  <Text style={styles.tipText}>No group photos or heavy filters</Text>
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#E53E3E" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.btnRow}>
                <Pressable style={styles.backButton} onPress={goBack}>
                  <Ionicons name="arrow-back" size={20} color="#534AB7" />
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Button
                    title={loading ? 'Creating Profile...' : 'Complete Setup'}
                    onPress={handleSubmit}
                    disabled={loading}
                    variant="primary"
                    style={{
                      backgroundColor: !loading ? '#534AB7' : '#CBD5E0',
                    }}
                  />
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  progressDotActive: {
    backgroundColor: '#534AB7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  stepContainer: {
    paddingTop: 16,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#534AB7',
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#718096',
    lineHeight: 22,
    marginBottom: 28,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A202C',
  },
  readOnlyInput: {
    backgroundColor: '#E2E8F0',
    color: '#718096',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'right',
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F7FAFC',
  },
  chipSelected: {
    borderColor: '#534AB7',
    backgroundColor: '#EEEDFE',
  },
  chipText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#534AB7',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityCard: {
    width: '47%',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7FAFC',
    position: 'relative',
  },
  activityCardSelected: {
    borderColor: '#534AB7',
    backgroundColor: '#EEEDFE',
  },
  activityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
  },
  activityLabelSelected: {
    color: '#534AB7',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#534AB7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 2,
  },
  rateCurrency: {
    fontSize: 24,
    fontWeight: '600',
    color: '#718096',
  },
  rateAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#534AB7',
  },
  rateUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
    marginLeft: 4,
  },
  ratePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  rateChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F7FAFC',
  },
  rateChipSelected: {
    borderColor: '#534AB7',
    backgroundColor: '#EEEDFE',
  },
  rateChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  rateChipTextSelected: {
    color: '#534AB7',
  },
  rateHint: {
    fontSize: 13,
    color: '#38A169',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },
  photoPickerContainer: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 280,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 24,
    position: 'relative',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEEDFE',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#534AB7',
  },
  photoPlaceholderHint: {
    fontSize: 13,
    color: '#718096',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changePhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  photoTips: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginBottom: 24,
  },
  photoTipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#718096',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#E53E3E',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#534AB7',
  },
});
