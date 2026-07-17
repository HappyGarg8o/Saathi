import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePartnerBookingStore, BookingRequest } from '../../store/usePartnerBookingStore';
import { Ionicons } from '@expo/vector-icons';

type TabFilter = 'pending' | 'upcoming' | 'completed';

const ACTIVITY_ICONS: Record<string, any> = {
  Coffee: 'cafe',
  Dinner: 'restaurant',
  Movie: 'film',
  'City Walk': 'walk',
  'Event Plus-One': 'people',
  Custom: 'sparkles',
};

export default function RequestsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    fetchRequests,
    acceptBooking,
    declineBooking,
    startSession,
    getPending,
    getUpcoming,
    getCompleted,
    loading,
  } = usePartnerBookingStore();

  const [tab, setTab] = useState<TabFilter>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'grey' } | null>(null);

  const showToast = (message: string, type: 'success' | 'grey') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, []);

  const handleAccept = (id: string) => {
    Alert.alert('Accept Booking', 'Are you sure you want to accept this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          setProcessingId(id);
          const success = await acceptBooking(id);
          setProcessingId(null);
          if (success) {
            showToast("✅ Booking accepted! Session confirmed.", "success");
            setTab('upcoming');
            await fetchRequests();
          } else {
            Alert.alert('Error', 'Failed to accept booking request.');
          }
        },
      },
    ]);
  };

  const handleDecline = (id: string) => {
    Alert.alert('Decline Booking', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setProcessingId(id);
          const success = await declineBooking(id);
          setProcessingId(null);
          if (success) {
            showToast("Booking declined", "grey");
            await fetchRequests();
          } else {
            Alert.alert('Error', 'Failed to decline booking request.');
          }
        },
      },
    ]);
  };

  const handleStartSession = async (id: string) => {
    console.log('START SESSION TAPPED:', id);
    const success = await startSession(id);
    console.log('START SESSION RESULT:', success);
    if (success) {
      router.push({
        pathname: '/session/[id]',
        params: { id }
      });
    }
  };

  const getTimeRemaining = (expiresAt: string): string => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    if (hours > 0) return `${hours}h ${mins}m left to respond`;
    return `${mins}m left to respond`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${time}`;
    if (isTomorrow) return `Tomorrow, ${time}`;
    return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
  };

  const getRequests = (): BookingRequest[] => {
    switch (tab) {
      case 'pending': return getPending();
      case 'upcoming': return getUpcoming();
      case 'completed': return getCompleted();
    }
  };

  const requests = getRequests();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Booking Requests</Text>
        <View style={styles.headerBadge}>
          <Ionicons name="notifications-outline" size={20} color="#534AB7" />
          {getPending().length > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{getPending().length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tab selector */}
      <View style={styles.tabRow}>
        {(['pending', 'upcoming', 'completed'] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {toast && (
        <View style={[
          styles.toastBanner,
          toast.type === 'success' ? styles.toastSuccess : styles.toastGrey
        ]}>
          <Text style={[
            styles.toastText,
            toast.type === 'success' ? styles.toastTextSuccess : styles.toastTextGrey
          ]}>
            {toast.message}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#534AB7" />}
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={tab === 'pending' ? 'hourglass-outline' : tab === 'upcoming' ? 'calendar-outline' : 'checkmark-done-outline'}
              size={56}
              color="#CBD5E0"
            />
            <Text style={styles.emptyTitle}>
              {tab === 'pending' && 'No pending requests'}
              {tab === 'upcoming' && 'No upcoming sessions'}
              {tab === 'completed' && 'No completed sessions yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'pending' && 'New booking requests will appear here'}
              {tab === 'upcoming' && 'Accept requests to see upcoming sessions'}
              {tab === 'completed' && 'Complete sessions to build your history'}
            </Text>
          </View>
        ) : (
          requests.map((req) => (
            <View key={req.id} style={styles.requestCard}>
              {/* Timer for pending */}
              {tab === 'pending' && (
                <View style={styles.timerBar}>
                  <Ionicons name="time-outline" size={14} color="#92400E" />
                  <Text style={styles.timerText}>{getTimeRemaining(req.expires_at)}</Text>
                </View>
              )}

              {/* User info row */}
              <View style={styles.userRow}>
                <Image source={{ uri: req.user_avatar }} style={styles.avatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{req.user_name}</Text>
                  <View style={styles.genderBadge}>
                    <Ionicons
                      name={req.user_gender === 'male' ? 'male' : req.user_gender === 'female' ? 'female' : 'person'}
                      size={12}
                      color="#718096"
                    />
                    <Text style={styles.genderText}>
                      {req.user_gender.charAt(0).toUpperCase() + req.user_gender.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Activity details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Ionicons name={(ACTIVITY_ICONS[req.activity_type] || 'cafe') as any} size={16} color="#534AB7" />
                  <Text style={styles.detailText}>{req.activity_type}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={16} color="#534AB7" />
                  <Text style={styles.detailText}>{formatDate(req.start_time)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={16} color="#534AB7" />
                  <Text style={styles.detailText}>{req.duration_hours}h</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={16} color="#534AB7" />
                  <Text style={styles.detailText} numberOfLines={1}>{req.meeting_point}</Text>
                </View>
              </View>

              {/* Earnings highlight */}
              <View style={styles.earningsRow}>
                <Text style={styles.earningsLabel}>Your Earnings</Text>
                <Text style={styles.earningsAmount}>₹{req.companion_payout}</Text>
              </View>

              {/* Actions */}
              {tab === 'pending' && (
                <View style={styles.actionRow}>
                  <Pressable 
                    style={[styles.declineBtn, processingId === req.id && styles.disabledBtn]} 
                    onPress={() => handleDecline(req.id)}
                    disabled={processingId !== null}
                  >
                    {processingId === req.id ? (
                      <ActivityIndicator color="#E53E3E" size="small" />
                    ) : (
                      <Text style={styles.declineBtnText}>Decline</Text>
                    )}
                  </Pressable>
                  <Pressable 
                    style={[styles.acceptBtn, processingId === req.id && styles.disabledBtn]} 
                    onPress={() => handleAccept(req.id)}
                    disabled={processingId !== null}
                  >
                    {processingId === req.id ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    )}
                  </Pressable>
                </View>
              )}

              {tab === 'upcoming' && (
                <Pressable style={styles.startBtn} onPress={() => handleStartSession(req.id)}>
                  <Ionicons name="play" size={18} color="#FFFFFF" />
                  <Text style={styles.startBtnText}>Start Session (Dev)</Text>
                </Pressable>
              )}

              {tab === 'completed' && (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#38A169" />
                  <Text style={styles.completedText}>Completed — ₹{req.companion_payout} earned</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
  },
  headerBadge: {
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E53E3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  tabBtnActive: {
    backgroundColor: '#EEEDFE',
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  tabBtnTextActive: {
    color: '#534AB7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A202C',
  },
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  genderText: {
    fontSize: 13,
    color: '#718096',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEEDFE',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#534AB7',
    fontWeight: '500',
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  earningsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#38A169',
  },
  earningsAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#38A169',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#FED7D7',
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E53E3E',
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#534AB7',
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1D9E75',
  },
  startBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#38A169',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  toastBanner: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    flexDirection: 'row',
  },
  toastSuccess: {
    backgroundColor: '#C6F6D5',
    borderWidth: 1,
    borderColor: '#38A169',
  },
  toastGrey: {
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E0',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toastTextSuccess: {
    color: '#22543D',
  },
  toastTextGrey: {
    color: '#4A5568',
  },
});
