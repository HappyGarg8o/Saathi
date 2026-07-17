import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  Switch,
  Modal,
  Pressable,
} from 'react-native';
import { getMockLocation, startMockLocationTracking } from '../../services/mockLocation';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBookingStore } from '../../store/useBookingStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Card, Avatar } from '@saathi/ui';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKeepAwake } from 'expo-keep-awake';
import { supabase } from '../../lib/supabase';

export default function ActiveSessionScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const { activeSession, startSession, endSession, triggerSos } = useBookingStore();
  const { user } = useAuthStore();
  const userCity = user?.city || 'Delhi';

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState('--:--:--');
  const [sosSent, setSosSent] = useState(false);

  // Extension states
  const [showExtendSheet, setShowExtendSheet] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [extensionStatus, setExtensionStatus] = useState<'none' | 'extended'>('none');
  const [extendedHours, setExtendedHours] = useState(0);
  const [flashGreen, setFlashGreen] = useState(false);

  const [locationEnabled, setLocationEnabled] = useState(true);
  const [location, setLocation] = useState<any>(null);
  const [emergencyContact, setEmergencyContact] = useState({
    name: user?.emergency_contact_name || 'Rahul (Brother)',
    phone: user?.emergency_contact_phone || '+91 9876543210',
  });

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Sync Emergency Contact when user profile is loaded
  useEffect(() => {
    if (user) {
      setEmergencyContact({
        name: user.emergency_contact_name || 'Rahul (Brother)',
        phone: user.emergency_contact_phone || '+91 9876543210',
      });
    }
  }, [user]);

  // Mock Location Tracking
  useEffect(() => {
    if (!locationEnabled) {
      setLocation(null);
      return;
    }
    const tracker = startMockLocationTracking(userCity, (loc) => {
      setLocation(loc);
    });
    return () => tracker.remove();
  }, [locationEnabled, userCity]);

  // Pulsing animation for the status dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Fetch / load booking data on mount & start session
  useEffect(() => {
    const loadBookingData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Start the session on mount
        await startSession(id);

        let foundBooking = null;
        if (id.startsWith('mock-booking-')) {
          const stored = await AsyncStorage.getItem('mock_bookings');
          const parsed = stored ? JSON.parse(stored) : [];
          foundBooking = parsed.find((b: any) => b.id === id);
        } else {
          const { data } = await supabase
            .from('bookings')
            .select(`
              *,
              companions (
                users (
                  name,
                  avatar_url
                )
              )
            `)
            .eq('id', id)
            .single();

          if (data) {
            const comp = Array.isArray(data.companions?.users) ? data.companions.users[0] : data.companions?.users;
            foundBooking = {
              ...data,
              companion: {
                name: comp?.name || 'Companion',
                avatar_url: comp?.avatar_url || null,
              }
            };
          }
        }

        if (foundBooking) {
          setBooking(foundBooking);
        }
      } catch (err) {
        console.error('Error loading session:', err);
      } finally {
        setLoading(false);
      }
    };
    loadBookingData();
  }, [id]);

  // Sync SOS Sent state with active session
  useEffect(() => {
    if (activeSession?.sos_triggered) {
      setSosSent(true);
    }
  }, [activeSession]);

  // Safety Navigation Guard: warning if user tries to navigate back/away
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      // Intercept exit if booking is still active
      if (booking && booking.status === 'active') {
        e.preventDefault();
        Alert.alert(
          'Session is in progress',
          'You cannot navigate away while a session is active. Please end the session first if you want to leave.',
          [{ text: 'OK', style: 'cancel' }]
        );
      }
    });
    return unsubscribe;
  }, [navigation, booking]);

  // Countdown timer calculations
  useEffect(() => {
    if (!booking) return;

    const interval = setInterval(() => {
      // Calculate session end time based on started_at + duration hours
      const startMs = activeSession?.started_at
        ? new Date(activeSession.started_at).getTime()
        : new Date().getTime(); // fallback

      const durationMs = booking.duration_hours * 60 * 60 * 1000;
      const endMs = startMs + durationMs;
      const nowMs = Date.now();
      const diff = endMs - nowMs;

      if (diff <= 0) {
        setTimeRemaining('00:00:00');
        clearInterval(interval);
        handleEndSessionAuto();
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        const hStr = hours.toString().padStart(2, '0');
        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');

        setTimeRemaining(`${hStr}:${mStr}:${sStr}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking, activeSession]);

  const handleEndSessionAuto = async () => {
    if (!booking) return;
    try {
      await endSession(booking.id);
      router.replace({
        pathname: '/rate/[id]',
        params: { id: booking.id }
      });
    } catch (err) {
      console.error('Error auto-ending session:', err);
    }
  };

  const handleManualEndPress = () => {
    if (!booking) return;
    Alert.alert(
      'End Session',
      'Are you sure you want to end the session early?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            // Remove navigation guard before pushing redirect
            booking.status = 'completed'; // bypass guard
            const success = await endSession(booking.id);
            if (success) {
              router.replace({
                pathname: '/rate/[id]',
                params: { id: booking.id }
              });
            }
          },
        },
      ]
    );
  };

  const handleSosPress = () => {
    if (!booking) return;
    Alert.alert(
      'Emergency SOS',
      'This will alert your emergency contact and our safety team immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND SOS',
          style: 'destructive',
          onPress: async () => {
            const success = await triggerSos(
              booking.id,
              location
                ? { latitude: location.latitude, longitude: location.longitude }
                : getMockLocation(userCity)
            );
            if (success) {
              setSosSent(true);
            }
          },
        },
      ]
    );
  };

  const handleExtendRequest = () => {
    if (!booking) return;
    const rate = booking.duration_hours > 0 ? Math.round(booking.total_price / booking.duration_hours) : 499;
    const cost = selectedDuration === 0.5 ? Math.floor(rate * 0.5) : Math.round(rate * selectedDuration);

    Alert.alert(
      'Payment Confirmation',
      `Pay ₹${cost} to extend session by ${selectedDuration === 0.5 ? '30 minutes' : selectedDuration === 1 ? '1 hour' : '2 hours'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay Now', onPress: () => performExtension(cost) }
      ]
    );
  };

  const performExtension = async (cost: number) => {
    if (!booking) return;
    setShowExtendSheet(false);
    try {
      const newDuration = Number(booking.duration_hours) + selectedDuration;
      const newTotalPrice = Number(booking.total_price) + cost;
      const platformFee = Math.round(newTotalPrice * 0.25);
      const companionPayout = newTotalPrice - platformFee;

      // Update AsyncStorage if mock booking
      if (booking.id.startsWith('mock-booking-')) {
        const stored = await AsyncStorage.getItem('mock_bookings');
        const parsed = stored ? JSON.parse(stored) : [];
        const updated = parsed.map((b: any) => {
          if (b.id === booking.id) {
            return {
              ...b,
              duration_hours: newDuration,
              total_price: newTotalPrice,
              platform_fee: platformFee,
              companion_payout: companionPayout,
            };
          }
          return b;
        });
        await AsyncStorage.setItem('mock_bookings', JSON.stringify(updated));
      } else {
        // Update database
        const { error } = await supabase
          .from('bookings')
          .update({
            duration_hours: newDuration,
            total_price: newTotalPrice,
            platform_fee: platformFee,
            companion_payout: companionPayout,
          })
          .eq('id', booking.id);

        if (error) throw error;
      }

      // Update local state
      setBooking((prev: any) => ({
        ...prev,
        duration_hours: newDuration,
        total_price: newTotalPrice,
      }));

      // Update bookings in store list if it exists to keep everything in sync
      const { bookings: storeBookings } = useBookingStore.getState();
      const updatedStoreBookings = storeBookings.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              duration_hours: newDuration,
              total_price: newTotalPrice,
              platform_fee: platformFee,
              companion_payout: companionPayout,
            }
          : b
      );
      useBookingStore.setState({ bookings: updatedStoreBookings });

      setExtendedHours(selectedDuration);
      setExtensionStatus('extended');

      // Flash green
      setFlashGreen(true);
      setTimeout(() => setFlashGreen(false), 2000);

      // Auto dismiss success banner
      setTimeout(() => {
        setExtensionStatus('none');
      }, 3000);

    } catch (err) {
      console.error('Failed to extend booking:', err);
      Alert.alert('Error', 'Failed to extend session. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#E53E3E" />
        <Text style={styles.errorText}>Session details not found</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/browse')}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const rate = booking ? (booking.duration_hours > 0 ? Math.round(booking.total_price / booking.duration_hours) : 499) : 499;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <Animated.View style={[styles.pulsingDot, { opacity: pulseAnim }]} />
          <Text style={styles.topBarTitle}>Session in Progress</Text>
        </View>
        <Text style={styles.topBarSubtitle}>
          With {booking.companion?.name || 'Companion'} • {booking.activity_type}
        </Text>
      </View>

      {/* Extension request approved banner */}
      {extensionStatus === 'extended' && (
        <View style={styles.bannerSuccess}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#155724" />
          <Text style={styles.bannerSuccessText}>
            Session extended by {extendedHours === 0.5 ? '30 minutes' : `${extendedHours} hour`}! ✅
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TIMER CONTAINER */}
        <View style={styles.timerCircleContainer}>
          <View style={[styles.timerCircle, flashGreen && styles.circleFlashGreen]}>
            <Text style={[styles.timerText, flashGreen && styles.textFlashGreen]}>{timeRemaining}</Text>
            <Text style={styles.timerLabel}>Time Remaining</Text>
          </View>
        </View>

        {/* COMPANION CARD */}
        <Card style={styles.companionCard}>
          <View style={styles.companionRow}>
            <Avatar uri={booking.companion?.avatar_url} name={booking.companion?.name} size={60} shape="circle" />
            <View style={styles.companionMeta}>
              <Text style={styles.companionName}>{booking.companion?.name || 'Saathi Companion'}</Text>
              <Text style={styles.companionActivity}>🤝 {booking.activity_type}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="pin" size={14} color="#1D9E75" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {booking.meeting_point}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* SOS STATUS ALERTS */}
        {sosSent && (
          <View style={styles.sosAlertBanner}>
            <Ionicons name="warning" size={24} color="#FFFFFF" />
            <View style={styles.sosAlertTextContainer}>
              <Text style={styles.sosAlertTitle}>SOS Alert Activated</Text>
              <Text style={styles.sosAlertDesc}>
                Safety team has received your GPS coordinates. Emergency contacts notified. Our response team is calling you now.
              </Text>
            </View>
          </View>
        )}

        {/* SAFETY CONTROLS */}
        <View style={styles.safetyControlsContainer}>
          <View style={styles.safetyControlHeader}>
            <Ionicons name="shield-checkmark" size={18} color="#1D9E75" />
            <Text style={styles.safetyControlTitle}>Safety Tracking Active</Text>
          </View>
          
          <View style={styles.safetyCard}>
            <View style={styles.locationToggleRow}>
              <View style={styles.locationToggleText}>
                <Text style={styles.locationToggleLabel}>Live Location Sharing</Text>
                <Text style={styles.locationToggleDesc}>Visible to your emergency contacts</Text>
              </View>
              <Switch 
                value={locationEnabled}
                onValueChange={setLocationEnabled}
                trackColor={{ false: '#374151', true: '#1D9E75' }}
                thumbColor={'#FFFFFF'}
              />
            </View>
            
            {locationEnabled && location && (
              <View style={styles.coordinatesContainer}>
                <Text style={styles.coordinatesText}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
                <Text style={styles.simulatedLocationText}>
                  📍 Simulated location (GPS coming soon)
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.emergencyContactRow}>
              <View style={styles.emergencyIconContainer}>
                <Ionicons name="call" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.emergencyContactInfo}>
                <Text style={styles.emergencyContactLabel}>Emergency Contact</Text>
                <Text style={styles.emergencyContactName}>{emergencyContact.name}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* BUTTON ACTION CONTAINER */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.chatBtn}
            activeOpacity={0.8}
            onPress={() => {
              // temporarily mock booking status as completed for navigation transition
              const originalStatus = booking.status;
              booking.status = 'completed';
              router.push({
                pathname: '/chat/[bookingId]',
                params: { bookingId: booking.id }
              });
              // Restore state after route pushes
              setTimeout(() => {
                booking.status = originalStatus;
              }, 100);
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Chat</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity
            style={styles.extendBtn}
            activeOpacity={0.8}
            onPress={() => setShowExtendSheet(true)}
          >
            <Ionicons name="time-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Extend ⏱</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endSessionBtn}
            activeOpacity={0.8}
            onPress={handleManualEndPress}
          >
            <Ionicons name="stop-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>End Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FLOATING SOS BUTTON */}
      {sosSent ? (
        <View style={[styles.sosButtonFloating, styles.sosButtonSent]}>
          <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
          <Text style={styles.sosButtonFloatingText}>SOS Sent</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.sosButtonFloating}
          activeOpacity={0.85}
          onPress={handleSosPress}
        >
          <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
          <Text style={styles.sosButtonFloatingText}>SOS</Text>
        </TouchableOpacity>
      )}

      {/* Extension Bottom Sheet */}
      <Modal
        visible={showExtendSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExtendSheet(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setShowExtendSheet(false)}>
          <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Extend Session</Text>
            <Text style={styles.sheetSubtitle}>Request more time with {booking.companion?.name || 'Companion'}</Text>

            {/* Selection Grid */}
            <View style={styles.optionsList}>
              {[
                { label: '+30 minutes', val: 0.5, cost: Math.floor(rate * 0.5) },
                { label: '+1 hour', val: 1.0, cost: rate },
                { label: '+2 hours', val: 2.0, cost: rate * 2 },
              ].map((opt) => (
                <Pressable
                  key={opt.val}
                  style={[
                    styles.optionItem,
                    selectedDuration === opt.val && styles.optionItemSelected,
                  ]}
                  onPress={() => setSelectedDuration(opt.val)}
                >
                  <View style={styles.radioOutline}>
                    {selectedDuration === opt.val && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionPrice}>+₹{opt.cost}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sheetNote}>
              Note: Additional payment will be processed at current hourly rate
            </Text>

            <Pressable style={styles.sendRequestBtn} onPress={handleExtendRequest}>
              <Text style={styles.sendRequestBtnText}>Request Extension</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1923',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F1923',
  },
  errorText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginVertical: 16,
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: '#1D9E75',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  topBar: {
    backgroundColor: '#0F1923',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2E3D',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1D9E75',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  topBarSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // space for floating button
  },
  timerCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 40,
  },
  timerCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 6,
    borderColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 158, 117, 0.05)',
  },
  timerText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  timerLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
    fontWeight: '700',
  },
  companionCard: {
    backgroundColor: '#1A2E3D',
    borderColor: '#2D3E4F',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  companionMeta: {
    flex: 1,
    gap: 4,
  },
  companionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  companionActivity: {
    fontSize: 13,
    color: '#1D9E75',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  sosAlertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    padding: 12,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  sosAlertTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  sosAlertTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  sosAlertDesc: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  safetyControlsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  safetyControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  safetyControlTitle: {
    color: '#1D9E75',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  safetyCard: {
    backgroundColor: '#1A2E3D',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2D3E4F',
  },
  locationToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationToggleText: {
    flex: 1,
  },
  locationToggleLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationToggleDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  coordinatesContainer: {
    marginTop: 12,
    backgroundColor: '#0F1923',
    padding: 12,
    borderRadius: 8,
  },
  coordinatesText: {
    color: '#1D9E75',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 14,
    fontWeight: '700',
  },
  simulatedLocationText: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#2D3E4F',
    marginVertical: 16,
  },
  emergencyContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emergencyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyContactInfo: {
    flex: 1,
  },
  emergencyContactLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  emergencyContactName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
  },
  chatBtn: {
    flex: 1,
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  endSessionBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sosButtonFloating: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  sosButtonSent: {
    backgroundColor: '#991B1B',
    shadowColor: '#991B1B',
  },
  sosButtonFloatingText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  circleFlashGreen: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  textFlashGreen: {
    color: '#10B981',
  },
  bannerSuccess: {
    backgroundColor: '#D4EDDA',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#C3E6CB',
  },
  bannerSuccessText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#155724',
    flex: 1,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginTop: 12,
  },
  extendBtn: {
    flex: 1,
    backgroundColor: '#1D9E75',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    width: '100%',
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A202C',
  },
  sheetSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: -8,
  },
  optionsList: {
    gap: 12,
    marginVertical: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    backgroundColor: '#F7FAFC',
  },
  optionItemSelected: {
    borderColor: '#1D9E75',
    backgroundColor: '#EBFBFA',
  },
  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#A0AEC0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1D9E75',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1,
  },
  optionPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D9E75',
  },
  sheetNote: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 16,
  },
  sendRequestBtn: {
    backgroundColor: '#1D9E75',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendRequestBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
