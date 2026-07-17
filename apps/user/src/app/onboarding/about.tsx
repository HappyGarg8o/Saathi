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
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { OnboardingHeader } from '../../components/OnboardingHeader';

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad',
  'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Other',
];

const LANGUAGES = [
  'Hindi', 'English', 'Tamil', 'Telugu',
  'Kannada', 'Bengali', 'Marathi', 'Gujarati',
];

const GENDER_OPTIONS = [
  { value: 'male' as const, label: 'Man' },
  { value: 'female' as const, label: 'Woman' },
  { value: 'other' as const, label: 'Prefer not to say' },
];

export default function AboutScreen() {
  const router = useRouter();
  const {
    gender, age, city, languages,
    setGender, setAge, setCity, toggleLanguage,
  } = useOnboardingStore();
  const [showCityList, setShowCityList] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [ageError, setAgeError] = useState('');

  const filteredCities = citySearch
    ? CITIES.filter((c) => c.toLowerCase().includes(citySearch.toLowerCase()))
    : CITIES;

  const ageNum = parseInt(age, 10);
  const isValid = gender !== null && age.length > 0 && ageNum >= 18 && city.length > 0 && languages.length > 0;

  const handleContinue = () => {
    if (ageNum < 18) {
      setAgeError('You must be 18 or older to use Saathi');
      return;
    }
    setAgeError('');
    if (!isValid) return;
    router.push('/onboarding/interests');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <OnboardingHeader step={4} totalSteps={5} />

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
            <Text style={styles.title}>A little about you</Text>
            <Text style={styles.subtitle}>This helps us personalize your experience</Text>
          </View>

          {/* Gender */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.genderPill, gender === opt.value && styles.genderPillSelected]}
                  activeOpacity={0.8}
                  onPress={() => setGender(opt.value)}
                >
                  <Text style={[styles.genderPillText, gender === opt.value && styles.genderPillTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Age */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Age</Text>
            <TextInput
              style={styles.textInput}
              placeholder="25"
              placeholderTextColor="#D1D5DB"
              keyboardType="number-pad"
              maxLength={2}
              value={age}
              onChangeText={(text) => {
                setAge(text.replace(/\D/g, ''));
                if (ageError) setAgeError('');
              }}
            />
            {ageError ? <Text style={styles.ageErrorText}>{ageError}</Text> : null}
          </View>

          {/* City */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>City</Text>
            <TouchableOpacity
              style={styles.citySelector}
              activeOpacity={0.8}
              onPress={() => setShowCityList(!showCityList)}
            >
              <Text style={[styles.citySelectorText, !city && styles.citySelectorPlaceholder]}>
                {city || 'Select your city'}
              </Text>
              <Ionicons name={showCityList ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
            </TouchableOpacity>

            {showCityList && (
              <View style={styles.cityDropdown}>
                <TextInput
                  style={styles.citySearchInput}
                  placeholder="Search city..."
                  placeholderTextColor="#D1D5DB"
                  value={citySearch}
                  onChangeText={setCitySearch}
                />
                {filteredCities.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.cityOption, city === c && styles.cityOptionSelected]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setCity(c);
                      setShowCityList(false);
                      setCitySearch('');
                    }}
                  >
                    <Text style={[styles.cityOptionText, city === c && styles.cityOptionTextSelected]}>
                      {c}
                    </Text>
                    {city === c && <Ionicons name="checkmark" size={18} color="#1D9E75" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Languages */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Languages you speak</Text>
            <View style={styles.chipGrid}>
              {LANGUAGES.map((lang) => {
                const selected = languages.includes(lang);
                return (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.langChip, selected && styles.langChipSelected]}
                    activeOpacity={0.7}
                    onPress={() => toggleLanguage(lang)}
                  >
                    <Text style={[styles.langChipText, selected && styles.langChipTextSelected]}>
                      {lang}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderPill: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  genderPillSelected: {
    backgroundColor: '#1D9E75',
    borderColor: '#1D9E75',
  },
  genderPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  genderPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  ageErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '500',
  },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  citySelectorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  citySelectorPlaceholder: {
    color: '#D1D5DB',
  },
  cityDropdown: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  citySearchInput: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cityOptionSelected: {
    backgroundColor: '#F0FDF4',
  },
  cityOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  cityOptionTextSelected: {
    color: '#1D9E75',
    fontWeight: '700',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langChip: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  langChipSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#1D9E75',
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  langChipTextSelected: {
    color: '#1D9E75',
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
