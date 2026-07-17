import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { Card, Avatar, Button, Badge, Input } from '@saathi/ui';
import { Ionicons } from '@expo/vector-icons';

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad',
  'Chennai', 'Pune', 'Kolkata', 'Ahmedabad', 'Other',
];

const LANGUAGES = [
  'Hindi', 'English', 'Tamil', 'Telugu',
  'Kannada', 'Bengali', 'Marathi', 'Gujarati',
];

const AVATAR_OPTIONS = [
  { id: 'a1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&fit=crop' },
  { id: 'a2', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&fit=crop' },
  { id: 'a3', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&fit=crop' },
  { id: 'a4', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&fit=crop' },
  { id: 'a5', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&fit=crop' },
  { id: 'a6', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&fit=crop' },
];

export default function UserProfileScreen() {
  const router = useRouter();
  const { user, signOut, createProfile, updateEmergencyContact, loading } = useAuthStore();

  // Edit Profile States
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editDisplayName, setEditDisplayName] = useState(user?.display_name || '');
  const [editCity, setEditCity] = useState(user?.city || '');
  const [editLanguages, setEditLanguages] = useState<string[]>(user?.languages || []);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Avatar Picker States
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  // Emergency Contact Modal States
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactName, setContactName] = useState(user?.emergency_contact_name || '');
  const [contactPhone, setContactPhone] = useState(user?.emergency_contact_phone || '');

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out from your Saathi account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/onboarding/welcome');
          },
        },
      ]
    );
  };

  const handleSaveContact = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      Alert.alert('Error', 'Please enter a name and phone number.');
      return;
    }
    const success = await updateEmergencyContact(contactName.trim(), contactPhone.trim());
    if (success) {
      setContactModalVisible(false);
    } else {
      Alert.alert('Error', 'Failed to update emergency contact.');
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editDisplayName.trim() || !editCity) {
      Alert.alert('Error', 'Full name, display name and city are required.');
      return;
    }

    setProfileSubmitting(true);
    try {
      const success = await createProfile(
        editName.trim(),
        user?.gender || 'other',
        user?.avatar_url || null,
        editDisplayName.trim(),
        user?.age || undefined,
        editCity,
        editLanguages,
        user?.interests || []
      );
      if (success) {
        setProfileModalVisible(false);
      } else {
        Alert.alert('Error', 'Could not update profile details.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleSelectAvatar = async (url: string) => {
    try {
      const success = await createProfile(
        user?.name || '',
        user?.gender || 'other',
        url,
        user?.display_name || '',
        user?.age || undefined,
        user?.city || '',
        user?.languages || [],
        user?.interests || []
      );
      if (success) {
        setAvatarModalVisible(false);
      }
    } catch (err) {
      console.error('Error updating avatar:', err);
    }
  };

  const getGenderText = (g: string | null) => {
    if (!g) return 'Not Specified';
    return g.charAt(0).toUpperCase() + g.slice(1);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* HEADER (dark #0F1923) */}
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          <Avatar uri={user?.avatar_url} name={user?.name || 'User'} size={80} />
          <TouchableOpacity
            style={styles.cameraIconOverlay}
            activeOpacity={0.8}
            onPress={() => setAvatarModalVisible(true)}
          >
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerName}>{user?.name || 'Saathi User'}</Text>
        <Text style={styles.headerPhone}>{user?.phone || 'No phone linked'}</Text>

        <TouchableOpacity
          style={styles.editProfileBtn}
          activeOpacity={0.8}
          onPress={() => {
            setEditName(user?.name || '');
            setEditDisplayName(user?.display_name || '');
            setEditCity(user?.city || '');
            setEditLanguages(user?.languages || []);
            setShowCityDropdown(false);
            setProfileModalVisible(true);
          }}
        >
          <Text style={styles.editProfileBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* BODY (white background) */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Section 1 — Personal Info */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Personal Info</Text>
        </View>
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Details</Text>
            <TouchableOpacity
              onPress={() => {
                setEditName(user?.name || '');
                setEditDisplayName(user?.display_name || '');
                setEditCity(user?.city || '');
                setEditLanguages(user?.languages || []);
                setShowCityDropdown(false);
                setProfileModalVisible(true);
              }}
              style={styles.cardEditIcon}
            >
              <Ionicons name="create-outline" size={20} color="#1D9E75" />
            </TouchableOpacity>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>Full Name</Text>
            <Text style={styles.rowValue}>{user?.name || 'Not Set'}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>Display Name</Text>
            <Text style={styles.rowValue}>{user?.display_name || 'Not Set'}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>Gender</Text>
            <Text style={styles.rowValue}>{getGenderText(user?.gender || null)}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>Age</Text>
            <Text style={styles.rowValue}>{user?.age || 'Not Set'}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>City</Text>
            <Text style={styles.rowValue}>{user?.city || 'Not Set'}</Text>
          </View>
          <View style={styles.rowDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.rowLabel}>Languages</Text>
            <Text style={styles.rowValue}>
              {user?.languages && user.languages.length > 0
                ? user.languages.join(', ')
                : 'Not Set'}
            </Text>
          </View>
        </Card>

        {/* Section 2 — Preferences */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Preferences</Text>
        </View>
        <Card style={styles.card}>
          <Text style={styles.preferencesTitle}>Activity Interests</Text>
          <View style={styles.pillsContainer}>
            {user?.interests && user.interests.length > 0 ? (
              user.interests.map((interest) => (
                <View key={interest} style={styles.interestPill}>
                  <Text style={styles.interestPillText}>{interest}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noInterestsText}>No interests selected yet.</Text>
            )}
          </View>
        </Card>

        {/* Section 3 — Safety Settings */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Safety Settings</Text>
        </View>
        <Card style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#0F6E56" />
            <Text style={styles.safetyHeading}>Safety Settings</Text>
          </View>

          {user?.emergency_contact_phone ? (
            <View style={styles.safetyDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.safetyLabel}>Emergency Contact</Text>
                <Text style={styles.safetyValue}>{user.emergency_contact_name}</Text>
              </View>
              <View style={styles.rowDividerSafety} />
              <View style={styles.detailRow}>
                <Text style={styles.safetyLabel}>Phone Number</Text>
                <Text style={styles.safetyValue}>{user.emergency_contact_phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.editContactTextLink}
                onPress={() => {
                  setContactName(user.emergency_contact_name || '');
                  setContactPhone(user.emergency_contact_phone || '');
                  setContactModalVisible(true);
                }}
              >
                <Text style={styles.editContactTextLinkText}>Edit Emergency Contact</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.safetyEmpty}>
              <Text style={styles.safetyEmptyText}>
                No emergency contact added yet.
              </Text>
              <TouchableOpacity
                style={styles.addContactBtn}
                onPress={() => {
                  setContactName('');
                  setContactPhone('');
                  setContactModalVisible(true);
                }}
              >
                <Text style={styles.addContactBtnText}>Add Emergency Contact</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.safetyFooterText}>
            This info is used if you trigger SOS
          </Text>
        </Card>

        {/* Section 4 — Account */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Account</Text>
        </View>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/bookings')}
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="calendar-outline" size={20} color="#4A5568" />
              <Text style={styles.menuRowText}>Booking History</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
          </TouchableOpacity>
          
          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Help & Support', 'Our support team is available 24/7. Contact us at support@saathi.in')}
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="help-circle-outline" size={20} color="#4A5568" />
              <Text style={styles.menuRowText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Rate the App', 'Thank you for using Saathi! Rating functionality will be available soon on App Store / Play Store.')}
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="star-outline" size={20} color="#4A5568" />
              <Text style={styles.menuRowText}>Rate the App</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Privacy Policy', 'Your privacy is our priority. Read our privacy policy at https://saathi.in/privacy')}
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="lock-closed-outline" size={20} color="#4A5568" />
              <Text style={styles.menuRowText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
          </TouchableOpacity>
        </Card>

        {/* Section 5 — Sign Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.8}
          style={styles.signOutBtn}
        >
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContentBottom}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Input
                label="Full Name"
                placeholder="e.g. Arjun Mehta"
                value={editName}
                onChangeText={setEditName}
                autoCapitalize="words"
              />

              <Input
                label="Display Name"
                placeholder="e.g. Arjun"
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                autoCapitalize="words"
              />

              {/* City Dropdown */}
              <Text style={styles.modalInputLabel}>City</Text>
              <TouchableOpacity
                style={styles.modalCitySelector}
                activeOpacity={0.8}
                onPress={() => setShowCityDropdown(!showCityDropdown)}
              >
                <Text style={styles.modalCitySelectorText}>
                  {editCity || 'Select your city'}
                </Text>
                <Ionicons name={showCityDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
              </TouchableOpacity>

              {showCityDropdown && (
                <View style={styles.modalCityDropdown}>
                  {CITIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.modalCityOption, editCity === c && styles.modalCityOptionSelected]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setEditCity(c);
                        setShowCityDropdown(false);
                      }}
                    >
                      <Text style={[styles.modalCityOptionText, editCity === c && styles.modalCityOptionTextSelected]}>
                        {c}
                      </Text>
                      {editCity === c && <Ionicons name="checkmark" size={16} color="#1D9E75" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Languages Multi-select */}
              <Text style={styles.modalInputLabel}>Languages you speak</Text>
              <View style={styles.modalChipGrid}>
                {LANGUAGES.map((lang) => {
                  const selected = editLanguages.includes(lang);
                  return (
                    <TouchableOpacity
                      key={lang}
                      style={[styles.modalLangChip, selected && styles.modalLangChipSelected]}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (selected) {
                          setEditLanguages(editLanguages.filter((l) => l !== lang));
                        } else {
                          setEditLanguages([...editLanguages, lang]);
                        }
                      }}
                    >
                      <Text style={[styles.modalLangChipText, selected && styles.modalLangChipSelectedText]}>
                        {lang}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {profileSubmitting ? (
                <ActivityIndicator size="small" color="#1D9E75" style={styles.modalLoader} />
              ) : (
                <Button
                  title="Save Details"
                  onPress={handleSaveProfile}
                  variant="primary"
                  style={styles.modalSubmitBtn}
                />
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* AVATAR PRESETS MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={avatarModalVisible}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={styles.avatarModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Avatar</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarModalBody}>
              <Text style={styles.avatarHelperText}>Pick one of these premium presets</Text>
              
              <View style={styles.avatarOptionsGrid}>
                {AVATAR_OPTIONS.map((item) => {
                  const selected = user?.avatar_url === item.url;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => handleSelectAvatar(item.url)}
                      style={[
                        styles.avatarOptionWrapper,
                        selected && styles.avatarOptionWrapperSelected,
                      ]}
                    >
                      <Image source={{ uri: item.url }} style={styles.avatarOptionImg} />
                      {selected && (
                        <View style={styles.avatarCheckBadge}>
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* EMERGENCY CONTACT MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={contactModalVisible}
        onRequestClose={() => setContactModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContentBottom}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Emergency Contact</Text>
              <TouchableOpacity onPress={() => setContactModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalSubtitle}>
                This person will receive an SMS with your live location if you trigger SOS.
              </Text>
              
              <Input
                label="Contact Name"
                placeholder="e.g. John Doe"
                value={contactName}
                onChangeText={setContactName}
              />
              
              <Input
                label="Phone Number"
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
                value={contactPhone}
                onChangeText={setContactPhone}
              />
              
              {loading ? (
                <ActivityIndicator size="small" color="#1D9E75" style={styles.modalLoader} />
              ) : (
                <Button
                  title="Save Emergency Contact"
                  onPress={handleSaveContact}
                  variant="primary"
                  style={styles.modalSubmitBtn}
                />
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1923',
  },
  header: {
    backgroundColor: '#0F1923',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 12,
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1D9E75',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0F1923',
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  headerPhone: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  editProfileBtn: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    backgroundColor: '#F7F8FA',
  },
  sectionHeaderRow: {
    marginTop: 8,
    marginBottom: -4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
  },
  cardEditIcon: {
    padding: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 14,
    color: '#1A202C',
    fontWeight: '600',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#EDF2F7',
  },
  preferencesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 12,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestPill: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#1D9E75',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  interestPillText: {
    fontSize: 12,
    color: '#1D9E75',
    fontWeight: '700',
  },
  noInterestsText: {
    fontSize: 13,
    color: '#718096',
    fontStyle: 'italic',
  },
  safetyCard: {
    backgroundColor: '#E1F5EE',
    borderColor: '#B4E7D6',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  safetyHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F6E56',
  },
  safetyDetails: {
    marginTop: 4,
  },
  safetyLabel: {
    fontSize: 14,
    color: '#0F6E56',
    fontWeight: '500',
  },
  safetyValue: {
    fontSize: 14,
    color: '#0F6E56',
    fontWeight: '700',
  },
  rowDividerSafety: {
    height: 1,
    backgroundColor: '#B4E7D6',
  },
  editContactTextLink: {
    alignSelf: 'center',
    marginTop: 12,
    padding: 4,
  },
  editContactTextLinkText: {
    color: '#0F6E56',
    fontWeight: '700',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  safetyEmpty: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  safetyEmptyText: {
    fontSize: 13,
    color: '#0F6E56',
    fontWeight: '500',
    marginBottom: 12,
  },
  addContactBtn: {
    backgroundColor: '#0F6E56',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addContactBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  safetyFooterText: {
    fontSize: 11,
    color: '#0F6E56',
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 14,
    fontWeight: '600',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  signOutBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  signOutBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentBottom: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5568',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalCitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalCitySelectorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A202C',
  },
  modalCityDropdown: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalCityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  modalCityOptionSelected: {
    backgroundColor: '#F0FDF4',
  },
  modalCityOptionText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  modalCityOptionTextSelected: {
    color: '#1D9E75',
    fontWeight: '700',
  },
  modalChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  modalLangChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  modalLangChipSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#1D9E75',
  },
  modalLangChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  modalLangChipSelectedText: {
    color: '#1D9E75',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    width: '100%',
    marginTop: 16,
  },
  modalLoader: {
    marginVertical: 16,
  },
  // Avatar presets styles
  avatarModalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    overflow: 'hidden',
  },
  avatarModalBody: {
    padding: 20,
    alignItems: 'center',
  },
  avatarHelperText: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 16,
    textAlign: 'center',
  },
  avatarOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  avatarOptionWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
    position: 'relative',
  },
  avatarOptionWrapperSelected: {
    borderColor: '#1D9E75',
  },
  avatarOptionImg: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  avatarCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1D9E75',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
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
});
