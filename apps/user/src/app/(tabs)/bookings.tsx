import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBookingStore, Booking } from '../../store/useBookingStore';
import { Card, Avatar, StarRating, Button } from '@saathi/ui';

export default function BookingsHistoryScreen() {
  const router = useRouter();
  const { bookings, fetchBookings, submitReview, cancelBooking, loading, error } = useBookingStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [ratingsMap, setRatingsMap] = useState<Record<string, number>>({});

  // Modal Rating States
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const shimmerOpacity = React.useRef(new Animated.Value(0.4)).current;

  // Cancel Modal States
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Toast States
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'warning' | 'error'>('success');
  const toastAnim = React.useRef(new Animated.Value(-100)).current;

  const showToast = (message: string, type: 'success' | 'warning' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 50,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(toastAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => setToastVisible(false));
  };

  const handleConfirmCancellation = async () => {
    if (!bookingToCancel) return;
    setIsCancelling(true);
    const res = await cancelBooking(bookingToCancel.id);
    setIsCancelling(false);
    setCancelModalVisible(false);

    if (res?.success) {
      const refund = res.refundAmount;
      const hours = (new Date(bookingToCancel.start_time).getTime() - Date.now()) / 3600000;
      
      if (hours >= 3) {
        showToast(`Booking cancelled. ₹${refund} will be refunded`, 'success');
      } else if (hours > 0) {
        showToast(`Booking cancelled. ₹${refund} refund initiated`, 'warning');
      } else {
        showToast(`Booking cancelled. No refund applicable`, 'error');
      }

      setActiveTab('past');
    } else {
      showToast(`Failed to cancel booking`, 'error');
    }
  };

  // Pulsing animation for skeleton shimmer
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (loading) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerOpacity, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerOpacity, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      shimmerOpacity.setValue(1.0);
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [loading]);

  // Load bookings and ratings from storage on mount
  useEffect(() => {
    fetchBookings();
    
    const loadRatings = async () => {
      try {
        const saved = await AsyncStorage.getItem('mock_bookings');
        console.log('STORED BOOKINGS:', saved);

        const savedRatings = await AsyncStorage.getItem('mock_ratings');
        if (savedRatings) {
          setRatingsMap(JSON.parse(savedRatings));
        }
      } catch (err) {
        console.error('Error loading ratings:', err);
      }
    };

    loadRatings();
  }, [fetchBookings]);

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'upcoming') {
      return b.status === 'confirmed' || b.status === 'active' || b.status === 'pending';
    } else {
      return b.status === 'completed' || b.status === 'cancelled';
    }
  });

  const handleBookingPress = (bookingItem: Booking) => {
    router.push({
      pathname: '/booking-confirmation/[id]',
      params: { id: bookingItem.id }
    });
  };

  const handleRatingSubmit = async () => {
    if (!selectedBookingId) return;
    setRatingSubmitting(true);
    try {
      const success = await submitReview(selectedBookingId, ratingStars, reviewText);
      if (success) {
        // Save to AsyncStorage
        const updatedMap = { ...ratingsMap, [selectedBookingId]: ratingStars };
        await AsyncStorage.setItem('mock_ratings', JSON.stringify(updatedMap));
        setRatingsMap(updatedMap);
        setRatingModalVisible(false);
        // Reset states
        setSelectedBookingId(null);
        setRatingStars(5);
        setReviewText('');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setRatingSubmitting(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
      const day = d.toLocaleDateString('en-IN', { day: 'numeric' });
      const month = d.toLocaleDateString('en-IN', { month: 'short' });
      const timeStr = d.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${weekday} ${day} ${month}, ${timeStr}`;
    } catch (err) {
      return dateStr;
    }
  };

  const renderStatusBadge = (status: Booking['status']) => {
    let bgColor = '#FEF3C7';
    let textColor = '#92400E';
    let label = 'PENDING';

    if (status === 'confirmed') {
      bgColor = '#E1F5EE';
      textColor = '#0F6E56';
      label = 'CONFIRMED';
    } else if (status === 'active') {
      bgColor = '#EEF2FF';
      textColor = '#3B4FD8';
      label = 'ACTIVE';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color: textColor }]}>{label}</Text>
      </View>
    );
  };

  const SkeletonCard = () => (
    <Card style={styles.bookingCard}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.companionInfoRow}>
          <Animated.View style={[styles.skeletonAvatar, { opacity: shimmerOpacity }]} />
          <View style={styles.metaInfo}>
            <Animated.View style={[styles.skeletonTextName, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonTextSub, { opacity: shimmerOpacity }]} />
          </View>
        </View>
        <Animated.View style={[styles.skeletonBadge, { opacity: shimmerOpacity }]} />
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.skeletonDetails}>
        <Animated.View style={[styles.skeletonDetailLine, { opacity: shimmerOpacity }]} />
        <Animated.View style={[styles.skeletonDetailLine, { width: '60%', opacity: shimmerOpacity }]} />
      </View>
    </Card>
  );

  const renderBookingItem = ({ item }: { item: Booking }) => {
    const isCompleted = item.status === 'completed';
    const isCancelled = item.status === 'cancelled';
    const hasRating = ratingsMap[item.id] !== undefined;
    const ratingValue = ratingsMap[item.id];

    const companionName = item.companion?.name ?? 'Unknown Companion';
    const companionAvatar = item.companion?.avatar_url ?? null;

    let emoji = '✨';
    if (item.activity_type === 'Coffee') emoji = '☕';
    else if (item.activity_type === 'Dinner') emoji = '🍽️';
    else if (item.activity_type === 'Movie') emoji = '🎬';
    else if (item.activity_type === 'City Walk') emoji = '🚶';
    else if (item.activity_type === 'Event Plus-One') emoji = '🎉';

    return (
      <Card style={styles.bookingCard} onPress={() => handleBookingPress(item)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.companionInfoRow}>
            <Avatar uri={companionAvatar} name={companionName} size={44} shape="circle" />
            <View style={styles.metaInfo}>
              <Text style={styles.companionName}>{companionName}</Text>
              <Text style={styles.activityType}>{emoji} {item.activity_type}</Text>
            </View>
          </View>
          
          {!isCompleted && !isCancelled && renderStatusBadge(item.status)}
          {isCancelled && <Text style={styles.cancelledText}>Cancelled</Text>}
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.bookingDetailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color="#718096" />
            <Text style={styles.detailText}>{formatDateTime(item.start_time)}</Text>
          </View>
        </View>

        <View style={[styles.bookingDetailsRow, { marginTop: 8 }]}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color="#718096" />
            <Text style={styles.detailText}>{item.duration_hours} hour{item.duration_hours > 1 ? 's' : ''}</Text>
          </View>
          <View style={[styles.detailItem, { marginLeft: 16, flex: 1 }]}>
            <Ionicons name="pin-outline" size={14} color="#718096" />
            <Text style={styles.detailText} numberOfLines={1}>{item.meeting_point}</Text>
          </View>
        </View>

        <View style={styles.cardActionRow}>
          {isCompleted && !hasRating && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.rateBtn}
              onPress={() => {
                setSelectedBookingId(item.id);
                setRatingModalVisible(true);
              }}
            >
              <Text style={styles.rateBtnText}>Rate Experience</Text>
            </TouchableOpacity>
          )}

          {isCompleted && hasRating && (
            <View style={styles.ratingDisplayRow}>
              <StarRating rating={ratingValue} size={14} />
              <Text style={styles.ratedText}>Rated</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.viewDetailsBtn}
            onPress={() => handleBookingPress(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color="#1D9E75" />
          </TouchableOpacity>
        </View>

        {(!isCompleted && !isCancelled && (item.status === 'pending' || item.status === 'confirmed')) && (
          <TouchableOpacity
            style={styles.cancelBookingBtn}
            onPress={() => {
              setBookingToCancel(item);
              setCancelModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBookingText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>Your upcoming & past sessions</Text>
      </View>

      <View style={styles.pageContent}>
        {/* Tab Switcher Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('upcoming')}
            style={[styles.tabItem, activeTab === 'upcoming' && styles.activeTabItem]}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
              Upcoming
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('past')}
            style={[styles.tabItem, activeTab === 'past' && styles.activeTabItem]}
          >
            <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
              Past
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        {loading ? (
          <FlatList
            data={[1, 2, 3]}
            renderItem={() => <SkeletonCard />}
            keyExtractor={(item) => item.toString()}
            contentContainerStyle={styles.listContent}
          />
        ) : error && filteredBookings.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={48} color="#D1D5DB" />
            <Text style={styles.errorText}>Could not load bookings</Text>
            <TouchableOpacity onPress={fetchBookings} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredBookings.length === 0 ? (
          activeTab === 'upcoming' ? (
            <View style={styles.emptyContainer}>
              <View style={styles.illustrationCircle}>
                <Ionicons name="calendar-outline" size={48} color="#1D9E75" />
              </View>
              <Text style={styles.emptyTitle}>No upcoming bookings</Text>
              <Text style={styles.emptyText}>
                Find a companion and book your first Saathi experience
              </Text>
              <Button
                title="Browse Companions"
                onPress={() => router.push('/(tabs)/browse')}
                variant="primary"
                style={styles.browseBtn}
              />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.illustrationCircle}>
                <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No past bookings yet</Text>
              <Text style={styles.emptyText}>
                Your completed sessions will appear here
              </Text>
            </View>
          )
        ) : (
          <FlatList
            data={filteredBookings}
            renderItem={renderBookingItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={fetchBookings}
            refreshing={loading}
          />
        )}
      </View>

      {/* Star Rating Submission Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={ratingModalVisible}
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Your Experience</Text>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.ratingHelpText}>
                How was your time together? Tap stars to rate.
              </Text>

              {/* Interactive Stars Selector */}
              <View style={styles.starsSelectorRow}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => setRatingStars(val)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={val <= ratingStars ? 'star' : 'star-outline'}
                      size={36}
                      color="#F59E0B"
                      style={styles.starIcon}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Optional Text Review */}
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your experience (optional)..."
                placeholderTextColor="#A0AEC0"
                multiline={true}
                numberOfLines={4}
                value={reviewText}
                onChangeText={setReviewText}
              />

              {ratingSubmitting ? (
                <ActivityIndicator size="small" color="#1D9E75" style={styles.modalLoader} />
              ) : (
                <Button
                  title="Submit Rating"
                  onPress={handleRatingSubmit}
                  variant="primary"
                  style={styles.modalSubmitBtn}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {toastVisible && (
        <Animated.View style={[
          styles.toastContainer,
          toastType === 'success' ? styles.toastSuccess : toastType === 'warning' ? styles.toastWarning : styles.toastError,
          { transform: [{ translateY: toastAnim }] }
        ]}>
          <Ionicons 
             name={toastType === 'success' ? 'checkmark-circle' : toastType === 'warning' ? 'warning' : 'alert-circle'} 
             size={20} 
             color={toastType === 'success' ? '#0F6E56' : toastType === 'warning' ? '#92400E' : '#991B1B'} 
          />
          <Text style={[
            styles.toastText,
            toastType === 'success' ? styles.toastTextSuccess : toastType === 'warning' ? styles.toastTextWarning : styles.toastTextError
          ]}>
            {toastMessage}
          </Text>
        </Animated.View>
      )}

      {/* Cancellation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cancelModalVisible}
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Cancel Booking?</Text>
            
            {bookingToCancel && (
              <>
                <View style={styles.summaryBox}>
                  <Avatar uri={bookingToCancel.companion?.avatar_url || null} name={bookingToCancel.companion?.name || ''} size={40} shape="circle" />
                  <View style={styles.summaryMeta}>
                    <Text style={styles.summaryName}>{bookingToCancel.companion?.name}</Text>
                    <Text style={styles.summaryActivity}>{bookingToCancel.activity_type} • {formatDateTime(bookingToCancel.start_time)}</Text>
                  </View>
                </View>

                {(() => {
                  const hours = (new Date(bookingToCancel.start_time).getTime() - Date.now()) / 3600000;
                  if (hours >= 3) {
                    return (
                      <View style={[styles.policyBox, styles.policyBoxGreen]}>
                        <Text style={styles.policyTitle}>✅ Full Refund</Text>
                        <Text style={styles.policyDesc}>
                          ₹{bookingToCancel.total_price} will be refunded since you're cancelling more than 3 hours before the session.
                        </Text>
                      </View>
                    );
                  } else if (hours > 0) {
                    const half = Math.round(bookingToCancel.total_price * 0.5);
                    return (
                      <View style={[styles.policyBox, styles.policyBoxYellow]}>
                        <Text style={styles.policyTitle}>⚠️ 50% Refund</Text>
                        <Text style={styles.policyDesc}>
                          ₹{half} will be refunded. Cancelling within 3 hours of session incurs a 50% cancellation fee.
                        </Text>
                      </View>
                    );
                  } else {
                    return (
                      <View style={[styles.policyBox, styles.policyBoxRed]}>
                        <Text style={styles.policyTitle}>❌ No Refund</Text>
                        <Text style={styles.policyDesc}>
                          Session has already started or passed. No refund is applicable.
                        </Text>
                      </View>
                    );
                  }
                })()}

                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={styles.keepBookingBtn}
                    onPress={() => setCancelModalVisible(false)}
                  >
                    <Text style={styles.keepBookingText}>Keep Booking</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmCancelBtn}
                    onPress={handleConfirmCancellation}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.confirmCancelText}>Confirm Cancellation</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
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
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
  pageContent: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#1D9E75',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#1D9E75',
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    paddingTop: 16,
    gap: 16,
  },
  bookingCard: {
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
  },
  companionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaInfo: {
    marginLeft: 12,
  },
  companionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  activityType: {
    fontSize: 13,
    color: '#4A5568',
    marginTop: 2,
    fontWeight: '600',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cancelledText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#718096',
    backgroundColor: '#EDF2F7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 12,
  },
  bookingDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F7FAFC',
    paddingTop: 12,
  },
  rateBtn: {
    backgroundColor: '#1D9E75',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  rateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  ratingDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratedText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  viewDetailsText: {
    color: '#1D9E75',
    fontSize: 13,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: '#1D9E75',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  illustrationCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E1F5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseBtn: {
    width: '100%',
    maxWidth: 240,
  },
  // Skeleton Styles
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  skeletonTextName: {
    width: 120,
    height: 14,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonTextSub: {
    width: 70,
    height: 10,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonBadge: {
    width: 80,
    height: 20,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonDetails: {
    gap: 8,
  },
  skeletonDetailLine: {
    width: '80%',
    height: 12,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  // Rating Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    alignItems: 'center',
    paddingTop: 16,
  },
  ratingHelpText: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 16,
  },
  starsSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  starIcon: {
    padding: 4,
  },
  reviewInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1A202C',
    textAlignVertical: 'top',
    height: 80,
    marginBottom: 20,
  },
  modalSubmitBtn: {
    width: '100%',
  },
  modalLoader: {
    marginVertical: 12,
  },
  cancelBookingBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  cancelBookingText: {
    color: '#E24B4A',
    fontWeight: '600',
    fontSize: 13,
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  toastSuccess: { backgroundColor: '#E1F5EE' },
  toastWarning: { backgroundColor: '#FEF3C7' },
  toastError: { backgroundColor: '#FEE2E2' },
  toastText: { marginLeft: 12, fontSize: 14, fontWeight: '600', flex: 1 },
  toastTextSuccess: { color: '#0F6E56' },
  toastTextWarning: { color: '#92400E' },
  toastTextError: { color: '#991B1B' },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryMeta: {
    marginLeft: 12,
  },
  summaryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  summaryActivity: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  policyBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  policyBoxGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  policyBoxYellow: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF08A',
  },
  policyBoxRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#1A202C',
  },
  policyDesc: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 18,
  },
  sheetActions: {
    gap: 12,
  },
  keepBookingBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  keepBookingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A5568',
  },
  confirmCancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E24B4A',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
