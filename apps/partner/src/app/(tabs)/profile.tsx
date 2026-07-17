import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Switch,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePartnerAuthStore } from '../../store/usePartnerAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@saathi/ui';

const getInitials = (name?: string | null) => {
  if (!name) return 'C';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, companion, toggleActive, updateProfile, signOut, loading, updateEmergencyContact } = usePartnerAuthStore();
  const [editingBio, setEditingBio] = useState(false);
  const [editBioText, setEditBioText] = useState(companion?.bio || '');
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactName, setContactName] = useState(user?.emergency_contact_name || '');
  const [contactPhone, setContactPhone] = useState(user?.emergency_contact_phone || '');

  if (!user || !companion) return null;

  const handleSaveContact = async () => {
    if (contactName.trim() && contactPhone.trim()) {
      const success = await updateEmergencyContact(contactName.trim(), contactPhone.trim());
      if (success) {
        setContactModalVisible(false);
      }
    }
  };

  const handlePhotoChange = () => {
    Alert.alert('Coming Soon', 'Photo upload will be available in the next update.');
  };

  const saveBio = async () => {
    await updateProfile({ bio: editBioText });
    setEditingBio(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Profile</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <Pressable style={styles.avatarWrapper} onPress={handlePhotoChange}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>{getInitials(user.name)}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </Pressable>

          <Text style={styles.profileName}>{user.name || 'Companion'}</Text>

          <View style={styles.badgesRow}>
            {companion.aadhaar_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#38A169" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#ECC94B" />
              <Text style={styles.ratingText}>{companion.rating_avg.toFixed(1)}</Text>
            </View>
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionText}>{companion.total_sessions} sessions</Text>
            </View>
          </View>
        </View>

        {/* Accept bookings toggle */}
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="flash" size={20} color={companion.is_active ? '#38A169' : '#A0AEC0'} />
              <View>
                <Text style={styles.settingLabel}>Accept New Bookings</Text>
                <Text style={styles.settingHint}>
                  {companion.is_active ? 'You\'re visible to users' : 'You\'re hidden from browse'}
                </Text>
              </View>
            </View>
            <Switch
              value={companion.is_active}
              onValueChange={toggleActive}
              trackColor={{ false: '#E2E8F0', true: '#C6F6D5' }}
              thumbColor={companion.is_active ? '#38A169' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Bio section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bio</Text>
            <Pressable onPress={() => editingBio ? saveBio() : setEditingBio(true)}>
              <Text style={styles.editLink}>{editingBio ? 'Save' : 'Edit'}</Text>
            </Pressable>
          </View>
          {editingBio ? (
            <TextInput
              style={styles.bioInput}
              value={editBioText}
              onChangeText={setEditBioText}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
          ) : (
            <Text style={styles.bioText}>{companion.bio || 'No bio set'}</Text>
          )}
        </View>

        {/* Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={18} color="#534AB7" />
            <Text style={styles.detailLabel}>Hourly Rate</Text>
            <Text style={styles.detailValue}>₹{companion.hourly_rate}/hr</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={18} color="#534AB7" />
            <Text style={styles.detailLabel}>City</Text>
            <Text style={styles.detailValue}>{companion.city}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="resize-outline" size={18} color="#534AB7" />
            <Text style={styles.detailLabel}>Service Radius</Text>
            <Text style={styles.detailValue}>{companion.service_radius_km} km</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="language-outline" size={18} color="#534AB7" />
            <Text style={styles.detailLabel}>Languages</Text>
            <Text style={styles.detailValue}>{companion.languages.join(', ') || 'English'}</Text>
          </View>
        </View>

        {/* Activities */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Activities</Text>
          <View style={styles.chipRow}>
            {(companion.activity_tags.length > 0 ? companion.activity_tags : ['Coffee', 'Dinner']).map((tag) => (
              <View key={tag} style={styles.activityChip}>
                <Text style={styles.activityChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            <Pressable onPress={() => setContactModalVisible(true)}>
              <Text style={styles.editLink}>{user?.emergency_contact_phone ? 'Edit' : 'Add'}</Text>
            </Pressable>
          </View>
          {user?.emergency_contact_phone ? (
            <View style={styles.contactDetails}>
              <Text style={styles.contactName}>{user.emergency_contact_name}</Text>
              <Text style={styles.contactPhone}>{user.emergency_contact_phone}</Text>
              <Text style={styles.contactHint}>Notified if you trigger SOS during a session.</Text>
            </View>
          ) : (
            <Text style={styles.bioText}>No emergency contact added yet. Stay safe by adding one.</Text>
          )}
        </View>

        {/* Sign Out */}
        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#E53E3E" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* Version */}
        <Text style={styles.versionText}>Saathi Partner v1.0.0</Text>
      </ScrollView>

      {/* Emergency Contact Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={contactModalVisible}
        onRequestClose={() => setContactModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Emergency Contact</Text>
            <Text style={styles.modalSubtitle}>This person will receive an SMS with your live location if you trigger SOS.</Text>
            
            <Input
              label="Contact Name"
              placeholder="e.g. Jane Doe"
              value={contactName}
              onChangeText={setContactName}
              style={{ marginBottom: 16 }}
            />
            
            <Input
              label="Phone Number"
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              value={contactPhone}
              onChangeText={setContactPhone}
              style={{ marginBottom: 24 }}
            />
            
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setContactModalVisible(false)} variant="outline" style={styles.modalBtn} />
              <Button title="Save" onPress={handleSaveContact} loading={loading} variant="primary" style={styles.modalBtn} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EEEDFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#534AB7',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#534AB7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A202C',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#C6F6D5',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38A169',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEFCBF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D69E2E',
  },
  sessionBadge: {
    backgroundColor: '#EEEDFE',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  sessionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#534AB7',
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
  },
  settingHint: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 10,
  },
  editLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#534AB7',
  },
  bioText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 22,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1A202C',
    minHeight: 80,
    backgroundColor: '#F7FAFC',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EDF2F7',
  },
  detailLabel: {
    fontSize: 14,
    color: '#718096',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityChip: {
    backgroundColor: '#EEEDFE',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  activityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#534AB7',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E53E3E',
  },
  versionText: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 20,
  },
  contactDetails: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  contactPhone: {
    fontSize: 14,
    color: '#4A5568',
    marginTop: 2,
  },
  contactHint: {
    fontSize: 12,
    color: '#718096',
    marginTop: 8,
    lineHeight: 16,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
  },
});
