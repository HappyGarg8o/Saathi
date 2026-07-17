import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ActiveSessionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);

  // Extension states
  const [showExtendSheet, setShowExtendSheet] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(1); // 0.5 | 1 | 2 hours
  const [extensionStatus, setExtensionStatus] = useState<'none' | 'pending' | 'extended'>('none');
  const [extendedHours, setExtendedHours] = useState(0);
  const [flashGreen, setFlashGreen] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // On mount: Fetch booking, update status to active
  useEffect(() => {
    const initSession = async () => {
      try {
        setLoading(true);
        // Load booking details
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            users (
              id, name, avatar_url, gender
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setBooking(data);
        setTimeLeft(Math.max(Math.round(data.duration_hours * 3600), 0));

        // Update status to active
        await supabase
          .from('bookings')
          .update({ status: 'active' })
          .eq('id', id);

      } catch (err) {
        console.error('Error starting session:', err);
        Alert.alert('Error', 'Failed to start session. Please try again.');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [id]);

  // Pulsing dot animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (loading || !booking || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(t - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, loading, booking]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSOS = () => {
    console.log('🚨 SOS alert with booking details:', JSON.stringify(booking));
    Alert.alert(
      '🚨 SOS Activated',
      'Your live location has been shared with Saathi Ops and emergency contacts. Stay safe.',
      [{ text: 'OK' }]
    );
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Session Early?',
      "You'll still receive full payment.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('bookings')
                .update({ status: 'completed' })
                .eq('id', id);

              if (error) throw error;

              // Navigate to Rating screen
              router.replace({
                pathname: '/rate/[id]',
                params: { id }
              });
            } catch (err) {
              console.error('Error ending session:', err);
              Alert.alert('Error', 'Failed to end session. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Companion Extend Request
  const handleExtendRequest = async () => {
    if (!booking) return;
    setShowExtendSheet(false);
    setExtensionStatus('pending');

    const rate = booking.duration_hours > 0 ? Math.round(booking.companion_payout / booking.duration_hours) : 374;
    const cost = Math.round(rate * selectedDuration);

    try {
      // Store extension request in AsyncStorage
      const request = {
        bookingId: id,
        requestedBy: 'companion',
        additionalHours: selectedDuration,
        additionalCost: cost,
        status: 'pending',
        timestamp: new Date().toISOString(),
      };
      await AsyncStorage.setItem('partner_extension_requests', JSON.stringify(request));

      // Simulate approval after 5 seconds
      setTimeout(async () => {
        setExtensionStatus('extended');
        setExtendedHours(selectedDuration);
        
        // Add time to timer
        setTimeLeft((prev) => prev + selectedDuration * 3600);
        
        // Update booking state and duration hours in Supabase
        const newDuration = Number(booking.duration_hours) + selectedDuration;
        await supabase
          .from('bookings')
          .update({ duration_hours: newDuration })
          .eq('id', id);

        setBooking((prev: any) => ({
          ...prev,
          duration_hours: newDuration,
          companion_payout: prev.companion_payout + cost,
        }));

        // Flash timer green briefly
        setFlashGreen(true);
        setTimeout(() => setFlashGreen(false), 2000);

        // Auto dismiss banner after 3 seconds
        setTimeout(() => {
          setExtensionStatus('none');
        }, 3000);

      }, 5000);

    } catch (err) {
      console.error('Extension request failed:', err);
      setExtensionStatus('none');
    }
  };

  if (loading || !booking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#534AB7" />
      </View>
    );
  }

  const userObj = Array.isArray(booking.users) ? booking.users[0] : booking.users;
  const companionRate = booking.duration_hours > 0 ? Math.round(booking.companion_payout / booking.duration_hours) : 374;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.statusRow}>
            <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
            <Text style={styles.statusText}>Session in Progress</Text>
          </View>
          <Text style={styles.subtitle}>
            With {userObj?.name || 'User'} • {booking.activity_type}
          </Text>
        </View>
      </View>

      {/* Extension request pending banner */}
      {extensionStatus === 'pending' && (
        <View style={styles.bannerPending}>
          <Ionicons name="time-outline" size={16} color="#92400E" />
          <Text style={styles.bannerPendingText}>
            Extension request sent ✓ Waiting for user confirmation...
          </Text>
        </View>
      )}

      {/* Extension request approved banner */}
      {extensionStatus === 'extended' && (
        <View style={styles.bannerSuccess}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#22543D" />
          <Text style={styles.bannerSuccessText}>
            Session extended by {extendedHours === 0.5 ? '30 minutes' : `${extendedHours} hour`}! ✅
          </Text>
        </View>
      )}

      {/* Timer Circle */}
      <View style={styles.timerSection}>
        <View style={[styles.outerCircle, flashGreen && styles.circleFlashGreen]}>
          <View style={styles.innerCircle}>
            <Text style={[styles.timerText, flashGreen && styles.textFlashGreen]}>
              {formatTime(timeLeft)}
            </Text>
            <Text style={styles.timerLabel}>TIME REMAINING</Text>
          </View>
        </View>
      </View>

      {/* User Card */}
      <View style={styles.userCard}>
        <Image
          source={{ uri: userObj?.avatar_url || 'https://i.pravatar.cc/300' }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userObj?.name || 'User'}</Text>
          <Text style={styles.userActivity}>{booking.activity_type}</Text>
          <View style={styles.meetingPointRow}>
            <Ionicons name="location-sharp" size={14} color="#534AB7" />
            <Text style={styles.meetingPointText} numberOfLines={2}>
              {booking.meeting_point}
            </Text>
          </View>
        </View>
      </View>

      {/* Earnings Card */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsHeader}>💰 Your Earnings</Text>
        <Text style={styles.earningsAmount}>₹{booking.companion_payout}</Text>
        <Text style={styles.earningsFooter}>Released 30 min after end</Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsBlock}>
        <Pressable
          style={styles.chatBtn}
          onPress={() =>
            router.push({
              pathname: '/chat/[bookingId]',
              params: { bookingId: id }
            })
          }
        >
          <Text style={styles.chatBtnText}>Chat</Text>
        </Pressable>

        <View style={styles.actionRow}>
          <Pressable style={styles.extendBtn} onPress={() => setShowExtendSheet(true)}>
            <Text style={styles.extendBtnText}>Extend ⏱</Text>
          </Pressable>
          <Pressable style={styles.endBtn} onPress={handleEndSession}>
            <Text style={styles.endBtnText}>End Session</Text>
          </Pressable>
        </View>
      </View>

      {/* SOS Button */}
      <View style={styles.sosBtnWrapper}>
        <Pressable style={styles.sosBtn} onPress={handleSOS}>
          <Ionicons name="warning" size={32} color="#FFFFFF" />
          <Text style={styles.sosBtnText}>SOS</Text>
        </Pressable>
      </View>

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
            <Text style={styles.sheetSubtitle}>Request more time with {userObj?.name || 'User'}</Text>

            {/* Selection Grid */}
            <View style={styles.optionsList}>
              {[
                { label: '+30 minutes', val: 0.5, cost: Math.round(companionRate * 0.5) },
                { label: '+1 hour', val: 1.0, cost: companionRate },
                { label: '+2 hours', val: 2.0, cost: companionRate * 2 },
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
              <Text style={styles.sendRequestBtnText}>Send Request</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1923', // Dark theme background
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F1923',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2332',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#38A169',
  },
  subtitle: {
    fontSize: 13,
    color: '#A0AEC0',
    marginTop: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38A169',
  },
  bannerPending: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  bannerPendingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },
  bannerSuccess: {
    backgroundColor: '#C6F6D5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#38A169',
  },
  bannerSuccessText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22543D',
    flex: 1,
  },
  timerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  outerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
    borderColor: '#534AB7', // Purple accent
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#534AB7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  circleFlashGreen: {
    borderColor: '#38A169',
    shadowColor: '#38A169',
  },
  textFlashGreen: {
    color: '#38A169',
  },
  innerCircle: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerLabel: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  userCard: {
    backgroundColor: '#161F30',
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#222F44',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E293B',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userActivity: {
    fontSize: 13,
    color: '#534AB7',
    fontWeight: '600',
    marginTop: 2,
  },
  meetingPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  meetingPointText: {
    fontSize: 12,
    color: '#A0AEC0',
    flex: 1,
  },
  earningsCard: {
    backgroundColor: '#1A2332',
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#38A169',
    gap: 4,
  },
  earningsHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  earningsAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#38A169',
    marginVertical: 4,
  },
  earningsFooter: {
    fontSize: 11,
    color: '#718096',
  },
  actionsBlock: {
    marginHorizontal: 24,
    marginTop: 24,
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chatBtn: {
    width: '100%',
    backgroundColor: '#2D3748',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  extendBtn: {
    flex: 1,
    backgroundColor: '#534AB7', // Partner purple
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  endBtn: {
    flex: 1.2,
    backgroundColor: '#E53E3E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sosBtnWrapper: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
  sosBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  sosBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
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
    borderColor: '#534AB7',
    backgroundColor: '#EEEDFE',
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
    backgroundColor: '#534AB7',
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
    color: '#38A169',
  },
  sheetNote: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 16,
  },
  sendRequestBtn: {
    backgroundColor: '#534AB7',
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
