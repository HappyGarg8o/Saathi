import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBookingStore } from '../../store/useBookingStore';
import { Card, Button, Avatar } from '@saathi/ui';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

export default function BookingConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { bookings: storeBookings, startSession, loading: storeLoading } = useBookingStore();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [bookingStatus, setBookingStatus] = useState<string>('pending');
  const [declinedVisible, setDeclinedVisible] = useState(false);

  const showDeclinedUI = () => {
    setDeclinedVisible(true);
  };

  // Fetch / load booking logic
  useEffect(() => {
    const loadBookingData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        if (id.startsWith('mock-booking-')) {
          const existing = await AsyncStorage.getItem('mock_bookings');
          const mockBookings = existing ? JSON.parse(existing) : [];
          const found = mockBookings.find((b: any) => b.id === id);
          if (found) {
            let companionName = 'Companion';
            let companionAvatar = null;
            try {
              const { data } = await supabase
                .from('companions')
                .select(`id, users(name, avatar_url)`)
                .eq('id', found.companion_id)
                .single();
              const compData = data as any;
              if (compData) {
                const userObj = Array.isArray(compData.users) ? compData.users[0] : compData.users;
                companionName = userObj?.name || 'Companion';
                companionAvatar = userObj?.avatar_url || null;
              }
            } catch (err) {
              console.error('Error fetching companion details for mock booking:', err);
            }
            setBooking({
              ...found,
              companion: {
                name: companionName,
                avatar_url: companionAvatar,
              }
            });
            setBookingStatus(found.status);
            if (found.status === 'cancelled') {
              setDeclinedVisible(true);
            }
          }
        } else {
          // Real booking: check store first
          const found = storeBookings.find((b) => b.id === id);
          if (found) {
            setBooking(found);
            setBookingStatus(found.status);
            if (found.status === 'cancelled') {
              setDeclinedVisible(true);
            }
          } else {
            // Fetch directly from DB
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
            const bData = data as any;
            if (bData) {
              const userObj = Array.isArray(bData.companions?.users)
                ? bData.companions?.users[0]
                : bData.companions?.users;
              const formattedBooking = {
                id: bData.id,
                user_id: bData.user_id,
                companion_id: bData.companion_id,
                activity_type: bData.activity_type,
                start_time: bData.start_time,
                duration_hours: parseFloat(bData.duration_hours),
                meeting_point: bData.meeting_point,
                total_price: bData.total_price,
                platform_fee: bData.platform_fee,
                companion_payout: bData.companion_payout,
                status: bData.status,
                created_at: bData.created_at,
                companion: {
                  name: userObj?.name || 'Anonymous Companion',
                  avatar_url: userObj?.avatar_url || null,
                },
              };
              setBooking(formattedBooking);
              setBookingStatus(formattedBooking.status);
              if (formattedBooking.status === 'cancelled') {
                setDeclinedVisible(true);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading booking:', err);
      } finally {
        setLoading(false);
      }
    };
    loadBookingData();
  }, [id, storeBookings]);

  // Countdown effect
  useEffect(() => {
    if (!booking) return;

    // Check status redirects
    if (bookingStatus === 'active') {
      router.replace(`/session/${booking.id}`);
      return;
    }

    if (bookingStatus === 'cancelled') {
      return;
    }

    const interval = setInterval(() => {
      const startMs = new Date(booking.start_time).getTime();
      const nowMs = Date.now();
      const diff = startMs - nowMs;

      if (diff <= 0) {
        setTimeLeft('Session is ready to start!');
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        let str = '';
        if (days > 0) str += `${days}d `;
        if (hours > 0 || days > 0) str += `${hours}h `;
        str += `${minutes}m ${seconds}s`;
        setTimeLeft(str);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking, bookingStatus, router]);

  // Real-time status listener using Supabase
  useEffect(() => {
    if (!id || id.startsWith('mock-booking-')) return;

    // Subscribe to booking status changes
    const subscription = supabase
      .channel(`booking-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          console.log('Booking status changed:', newStatus);
          
          if (newStatus === 'cancelled') {
            setBookingStatus('cancelled');
            showDeclinedUI();
          }
          if (newStatus === 'confirmed') {
            setBookingStatus('confirmed');
          }
          if (newStatus === 'active') {
            setBookingStatus('active');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  // Status polling as fallback / mock support
  useEffect(() => {
    if (!id) return;

    const pollStatus = setInterval(async () => {
      if (id.startsWith('mock-booking-')) {
        const existing = await AsyncStorage.getItem('mock_bookings');
        const mockBookings = existing ? JSON.parse(existing) : [];
        const found = mockBookings.find((b: any) => b.id === id);
        if (found) {
          if (found.status === 'cancelled' && bookingStatus !== 'cancelled') {
            setBookingStatus('cancelled');
            showDeclinedUI();
            clearInterval(pollStatus);
          } else if (found.status === 'confirmed' && bookingStatus !== 'confirmed') {
            setBookingStatus('confirmed');
            clearInterval(pollStatus);
          } else if (found.status === 'active' && bookingStatus !== 'active') {
            setBookingStatus('active');
            clearInterval(pollStatus);
          }
        }
      } else {
        const { data } = await supabase
          .from('bookings')
          .select('status')
          .eq('id', id)
          .single();
          
        if (data?.status === 'cancelled' && bookingStatus !== 'cancelled') {
          setBookingStatus('cancelled');
          showDeclinedUI();
          clearInterval(pollStatus);
        } else if (data?.status === 'confirmed' && bookingStatus !== 'confirmed') {
          setBookingStatus('confirmed');  
          clearInterval(pollStatus);
        } else if (data?.status === 'active' && bookingStatus !== 'active') {
          setBookingStatus('active');
          clearInterval(pollStatus);
        }
      }
    }, 10000);

    return () => clearInterval(pollStatus);
  }, [id, bookingStatus]);

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
        <Text style={styles.errorText}>Booking details not found</Text>
        <Button title="Go Back" onPress={() => router.replace('/(tabs)/browse')} />
      </SafeAreaView>
    );
  }

  const handleStartSession = async () => {
    // Warp-start the session immediately (Developer Bypass)
    const success = await startSession(booking.id);
    if (success) {
      router.push({
        pathname: '/session/[id]',
        params: { id: booking.id }
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Header */}
        {bookingStatus === 'pending' && (
          <View style={styles.successHeader}>
            <View style={[styles.successIconCircle, { backgroundColor: '#D69E2E', shadowColor: '#D69E2E' }]}>
              <Ionicons name="time-outline" size={56} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Waiting for companion to accept...</Text>
            <Text style={styles.successSubtitle}>
              1h 30m for companion to respond
            </Text>
          </View>
        )}

        {bookingStatus === 'confirmed' && (
          <View style={styles.successHeader}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={56} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Booking Confirmed! 🎉</Text>
            <Text style={styles.successSubtitle}>
              Your companion is notified and ready.
            </Text>
          </View>
        )}

        {bookingStatus === 'cancelled' && (
          <View style={styles.successHeader}>
            <View style={[styles.successIconCircle, { backgroundColor: '#E53E3E', shadowColor: '#E53E3E' }]}>
              <Ionicons name="close-circle" size={56} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Booking Declined ❌</Text>
            <Text style={styles.successSubtitle}>
              Unfortunately {booking.companion?.name || 'companion'} couldn't accept your booking.
            </Text>
          </View>
        )}

        {bookingStatus === 'active' && (
          <View style={styles.successHeader}>
            <View style={[styles.successIconCircle, { backgroundColor: '#1D9E75', shadowColor: '#1D9E75' }]}>
              <Ionicons name="play-circle-outline" size={56} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Session in Progress</Text>
            <Text style={styles.successSubtitle}>
              Meet your companion at the meeting point.
            </Text>
          </View>
        )}

        {/* Conditional Card (Countdown or Refund or Pending) */}
        {bookingStatus === 'cancelled' ? (
          <Card style={[styles.countdownCard, { backgroundColor: '#FFF5F5', borderColor: '#FED7D7' }]}>
            <Ionicons name="cash-outline" size={24} color="#E53E3E" style={styles.countdownIcon} />
            <Text style={[styles.countdownLabel, { color: '#E53E3E' }]}>FULL REFUND INITIATED</Text>
            <Text style={[styles.countdownTimer, { color: '#E53E3E', fontSize: 15, textAlign: 'center', marginTop: 8, fontWeight: '700' }]}>
              ₹{booking.total_price} will be refunded in 5-7 business days.
            </Text>
          </Card>
        ) : bookingStatus === 'pending' ? (
          <Card style={[styles.countdownCard, { backgroundColor: '#FEFCBF', borderColor: '#FEEBC8' }]}>
            <Ionicons name="alert-circle-outline" size={24} color="#B7791F" style={styles.countdownIcon} />
            <Text style={[styles.countdownLabel, { color: '#B7791F' }]}>REQUEST PENDING</Text>
            <Text style={[styles.countdownTimer, { color: '#B7791F', fontSize: 15, textAlign: 'center', marginTop: 8, fontWeight: '700' }]}>
              The companion has 90 minutes to accept or decline the request.
            </Text>
          </Card>
        ) : (
          <Card style={styles.countdownCard}>
            <Ionicons name="hourglass-outline" size={24} color="#534AB7" style={styles.countdownIcon} />
            <Text style={styles.countdownLabel}>SESSION COUNTDOWN</Text>
            <Text style={styles.countdownTimer}>{timeLeft || '-- : -- : --'}</Text>
          </Card>
        )}

        {/* Booking Details Summary */}
        <Card style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Meeting Details</Text>
          
          <View style={styles.companionRow}>
            <Avatar uri={booking.companion?.avatar_url} name={booking.companion?.name} size={48} />
            <View style={styles.companionMeta}>
              <Text style={styles.companionName}>{booking.companion?.name}</Text>
              <Text style={styles.companionLabelText}>Booked Companion</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="sparkles-outline" size={16} color="#718096" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Activity Type</Text>
                <Text style={styles.detailValue}>{booking.activity_type}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color="#718096" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Scheduled Time</Text>
                <Text style={styles.detailValue}>
                  {formatDate(booking.start_time)} at {formatTime(booking.start_time)}
                </Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="hourglass-outline" size={16} color="#718096" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{booking.duration_hours} hours</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Ionicons name="map-outline" size={16} color="#718096" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Meeting Point</Text>
                <Text style={styles.detailValue}>{booking.meeting_point}</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Safety Note */}
        <View style={styles.safetyBanner}>
          <Ionicons name="shield-checkmark" size={20} color="#0F6E56" />
          <View style={styles.safetyTextContainer}>
            <Text style={styles.safetyTitle}>Safety Reminder</Text>
            <Text style={styles.safetyText}>
              Keep transactions inside the app. Meet only in public places. Toggle the live location sharing and SOS buttons during your active session if you ever feel unsafe.
            </Text>
          </View>
        </View>

        {/* Start Session Button */}
        {(bookingStatus === 'confirmed' || bookingStatus === 'active') && (
          <Button
            title="Start Session"
            onPress={handleStartSession}
            loading={loading}
            variant="partner"
            style={styles.startSessionBtn}
          />
        )}

        {/* Action Buttons based on status */}
        {bookingStatus === 'cancelled' ? (
          <>
            <Button
              title="Find Another Companion"
              onPress={() => router.replace('/(tabs)/browse')}
              variant="primary"
              style={styles.bookingsBtn}
            />
            <Button
              title="Go Home"
              onPress={() => router.replace('/(tabs)/browse')}
              variant="outline"
              style={styles.homeBtn}
            />
          </>
        ) : (
          <>
            <Button
              title="View My Bookings"
              onPress={() => router.replace('/(tabs)/bookings')}
              variant="primary"
              style={styles.bookingsBtn}
            />
            <Button
              title="Back to Browse"
              onPress={() => router.replace('/(tabs)/browse')}
              variant="outline"
              style={styles.homeBtn}
            />
          </>
        )}

      {/* Declined Notification Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={declinedVisible}
        onRequestClose={() => setDeclinedVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.declinedBox}>
            <View style={styles.declinedIconCircle}>
              <Ionicons name="close" size={40} color="#FFFFFF" />
            </View>
            
            <Text style={styles.declinedTitle}>Booking Declined</Text>
            
            <Text style={styles.declinedText}>
              Unfortunately, {booking?.companion?.name || 'your companion'} couldn't accept your booking.
            </Text>

            <View style={styles.refundBox}>
              <Ionicons name="cash-outline" size={20} color="#E53E3E" />
              <View style={styles.refundTextContainer}>
                <Text style={styles.refundTitle}>Full Refund Initiated</Text>
                <Text style={styles.refundDesc}>
                  ₹{booking?.total_price} will be refunded in 5-7 business days.
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Find Another Companion"
                onPress={() => {
                  setDeclinedVisible(false);
                  router.replace('/(tabs)/browse');
                }}
                variant="primary"
                style={styles.modalBtn}
              />
              <Button
                title="Go Home"
                onPress={() => {
                  setDeclinedVisible(false);
                  router.replace('/(tabs)/browse');
                }}
                variant="outline"
                style={[styles.modalBtn, { marginTop: 10 }]}
              />
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#718096',
    marginVertical: 16,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  successHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A202C',
  },
  successSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
    fontWeight: '500',
  },
  countdownCard: {
    backgroundColor: '#EEEDFE',
    borderColor: '#D5D3FA',
    padding: 16,
    alignItems: 'center',
  },
  countdownIcon: {
    marginBottom: 6,
  },
  countdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#534AB7',
    letterSpacing: 1,
  },
  countdownTimer: {
    fontSize: 26,
    fontWeight: '800',
    color: '#534AB7',
    marginTop: 6,
  },
  detailsCard: {
    padding: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 14,
  },
  companionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companionMeta: {
    marginLeft: 12,
  },
  companionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
  },
  companionLabelText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 12,
  },
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 11,
    color: '#718096',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginTop: 2,
  },
  safetyBanner: {
    flexDirection: 'row',
    backgroundColor: '#E1F5EE',
    borderWidth: 1,
    borderColor: '#B4E7D6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    overflow: 'visible',
  },
  safetyTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F6E56',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  safetyText: {
    fontSize: 12,
    color: '#0F6E56',
    lineHeight: 1.6,
    marginTop: 4,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  startSessionBtn: {
    marginTop: 16,
  },
  bookingsBtn: {
    marginTop: 16,
  },
  homeBtn: {
    borderColor: '#E2E8F0',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  declinedBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  declinedIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E53E3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#E53E3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  declinedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 8,
  },
  declinedText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  refundBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  refundTextContainer: {
    flex: 1,
  },
  refundTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E53E3E',
  },
  refundDesc: {
    fontSize: 12,
    color: '#E53E3E',
    marginTop: 2,
    lineHeight: 16,
  },
  modalButtons: {
    width: '100%',
  },
  modalBtn: {
    width: '100%',
  },
});
