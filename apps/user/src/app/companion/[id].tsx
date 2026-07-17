import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Card, Avatar, StarRating, Button } from '@saathi/ui';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Review {
  id: string;
  stars: number;
  text: string;
  created_at: string;
  reviewer?: {
    name: string;
    avatar_url: string;
  };
}

interface CompanionProfile {
  id: string;
  user_id: string;
  aadhaar_verified: boolean;
  bio: string;
  hourly_rate: number;
  rating_avg: number;
  total_sessions: number;
  is_active: boolean;
  city: string;
  service_radius_km: number;
  activity_tags?: string[];
  activities?: string[];
  users?: {
    id: string;
    name: string;
    avatar_url: string;
    gender: 'male' | 'female' | 'other';
  };
  reviews?: Review[];
  companion_availability?: any[];
}

const DAYS_OF_WEEK = [
  { key: 'Mon', label: 'Mon', index: 1 },
  { key: 'Tue', label: 'Tue', index: 2 },
  { key: 'Wed', label: 'Wed', index: 3 },
  { key: 'Thu', label: 'Thu', index: 4 },
  { key: 'Fri', label: 'Fri', index: 5 },
  { key: 'Sat', label: 'Sat', index: 6 },
  { key: 'Sun', label: 'Sun', index: 0 },
];

export default function CompanionProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [companion, setCompanion] = useState<CompanionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanionDetails = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        // Query 1: Fetch Companion and availability
        const { data: companionData, error: companionError } = await supabase
          .from('companions')
          .select(`
            *,
            users (
              id, name, avatar_url, gender
            ),
            companion_availability (*)
          `)
          .eq('id', id)
          .single();

        if (companionError) {
          console.error('Error fetching companion details:', companionError);
          setError('Companion profile not found.');
          return;
        }

        if (!companionData) {
          setError('Companion profile not found.');
          return;
        }

        // Query 2: Fetch reviews separately using companion's user ID
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            id, stars, text, created_at,
            reviewer:reviewer_id (
              name, avatar_url
            )
          `)
          .eq('reviewee_id', companionData.users.id)
          .order('created_at', { ascending: false })
          .limit(3);

        if (reviewsError) {
          console.error('Error fetching reviews:', reviewsError);
        }

        const combined: CompanionProfile = {
          ...companionData,
          reviews: reviewsData || [],
        };

        setCompanion(combined);
      } catch (err: any) {
        console.error(err);
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanionDetails();
  }, [id]);

  const handleShare = async () => {
    if (!companion) return;
    try {
      await Share.share({
        message: `Check out ${companion.users?.name || 'companion'} on Saathi! A verified companion for social activities.`,
      });
    } catch (err) {
      console.error('Error sharing profile:', err);
    }
  };

  const isDayAvailable = (dayIndex: number) => {
    if (companion?.companion_availability && companion.companion_availability.length > 0) {
      return companion.companion_availability.some(
        (slot) => slot.day_of_week === dayIndex && slot.is_open
      );
    }
    // Fallback: Available Monday to Saturday
    return dayIndex >= 1 && dayIndex <= 6;
  };

  const activities = companion?.activity_tags || companion?.activities || ['Coffee', 'Dinner'];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Skeleton Top Section */}
        <View style={styles.skeletonPhoto} />
        
        {/* Skeleton Info Card */}
        <View style={[styles.infoCard, styles.skeletonCard]}>
          <View style={styles.skeletonPulseLine} />
          <View style={[styles.skeletonPulseLine, { width: '60%', marginTop: 10 }]} />
          <View style={[styles.skeletonPulseLine, { width: '40%', marginTop: 10 }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={false}>
          <View style={styles.section}>
            <View style={[styles.skeletonPulseLine, { width: '30%', height: 20 }]} />
            <View style={[styles.skeletonPulseLine, { width: '90%', height: 40, marginTop: 12 }]} />
          </View>
          <View style={styles.section}>
            <View style={[styles.skeletonPulseLine, { width: '35%', height: 20 }]} />
            <View style={styles.skeletonRow}>
              <View style={styles.skeletonStatBox} />
              <View style={styles.skeletonStatBox} />
              <View style={styles.skeletonStatBox} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error || !companion) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Profile Unreachable</Text>
        <Text style={styles.errorText}>{error || 'The companion profile you are looking for does not exist.'}</Text>
        <Button
          title="Return to Browse"
          onPress={() => router.replace('/(tabs)/browse')}
          style={styles.errorBtn}
        />
      </SafeAreaView>
    );
  }

  const companionName = companion.users?.name || 'Anonymous';
  const avatarUrl = companion.users?.avatar_url || 'https://via.placeholder.com/300';
  const ratingAvg = companion.rating_avg ? parseFloat(companion.rating_avg.toString()) : 5.0;
  const totalReviews = companion.reviews ? companion.reviews.length : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero Photo */}
        <View style={styles.heroSection}>
          <Image source={{ uri: avatarUrl }} style={styles.heroImage} />
          
          {/* Dark Overlay Gradient Simulation */}
          <View style={styles.imageOverlay} />
 
          {/* Action Buttons over image */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleBtn}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.nameText}>{companionName}</Text>
            
            {/* Inline badges */}
            <View style={styles.badgesRow}>
              {companion.users?.gender && (
                <View style={[styles.inlineGenderTag, styles[`genderTag_${companion.users.gender}` as keyof typeof styles] as any]}>
                  <Text style={[styles.inlineGenderText, styles[`genderText_${companion.users.gender}` as keyof typeof styles] as any]}>
                    {companion.users.gender.toUpperCase()}
                  </Text>
                </View>
              )}

              {companion.aadhaar_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#1D9E75" />
                  <Text style={styles.verifiedText}>VERIFIED</Text>
                </View>
              )}
            </View>
          </View>

          {/* rating + total sessions row */}
          <View style={styles.ratingRow}>
            <StarRating rating={ratingAvg} size={14} />
            <Text style={styles.ratingInfoText}>
              {ratingAvg.toFixed(1)} ({totalReviews} reviews) • {companion.total_sessions || 0} sessions
            </Text>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color="#9CA3AF" />
            <Text style={styles.locationText}>{companion.city || 'India'}</Text>
          </View>
        </View>

        {/* Sections Wrapper */}
        <View style={styles.detailsBody}>
          
          {/* Section 1: About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About {companionName.split(' ')[0]}</Text>
            <Text style={styles.bioText}>{companion.bio || 'No bio provided yet.'}</Text>

            {/* Horizontal Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>⭐</Text>
                <Text style={styles.statValue}>{ratingAvg.toFixed(1)}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>

              <View style={styles.statBoxDivider} />

              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>🗓️</Text>
                <Text style={styles.statValue}>{companion.total_sessions || 0}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>

              <View style={styles.statBoxDivider} />

              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>₹</Text>
                <Text style={styles.statValue}>{companion.hourly_rate}</Text>
                <Text style={styles.statLabel}>/hour</Text>
              </View>
            </View>
          </View>

          {/* Section 2: Activities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specialises in</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.activitiesContainer}
            >
              {activities.map((tag) => {
                let emoji = '✨';
                if (tag === 'Coffee') emoji = '☕';
                else if (tag === 'Dinner') emoji = '🍽️';
                else if (tag === 'Movie') emoji = '🎬';
                else if (tag === 'City Walk') emoji = '🚶';
                else if (tag === 'Event Plus-One') emoji = '🎉';

                return (
                  <View key={tag} style={styles.activityPill}>
                    <Text style={styles.activityPillText}>
                      {emoji} {tag}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Section 3: Availability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            
            {/* Days grid */}
            <View style={styles.daysGrid}>
              {DAYS_OF_WEEK.map((day) => {
                const available = isDayAvailable(day.index);
                return (
                  <View key={day.key} style={styles.dayCell}>
                    <View style={[styles.dayCircle, available ? styles.dayCircleAvailable : styles.dayCircleUnavailable]}>
                      <Text style={[styles.dayLetter, available ? styles.dayLetterAvailable : styles.dayLetterUnavailable]}>
                        {day.label[0]}
                      </Text>
                    </View>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.responseBanner}>
              <Ionicons name="time-outline" size={14} color="#1D9E75" />
              <Text style={styles.responseText}>Usually responds within 30 mins</Text>
            </View>
          </View>

          {/* Section 4: Reviews */}
          <View style={[styles.section, { borderBottomWidth: 0 }]}>
            <View style={styles.reviewsHeaderRow}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <View style={styles.reviewScoreRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.reviewScoreText}>
                  {ratingAvg.toFixed(1)} ({totalReviews} reviews)
                </Text>
              </View>
            </View>

            {companion.reviews && companion.reviews.length > 0 ? (
              <View style={styles.reviewsList}>
                {companion.reviews.slice(0, 3).map((review) => {
                  const reviewerName = review.reviewer?.name || 'Anonymous User';
                  const reviewerAvatar = review.reviewer?.avatar_url;
                  const reviewDate = new Date(review.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <Card key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewerHeader}>
                        <Avatar uri={reviewerAvatar} name={reviewerName} size={36} shape="circle" />
                        <View style={styles.reviewerMeta}>
                          <Text style={styles.reviewerName}>{reviewerName}</Text>
                          <Text style={styles.reviewDate}>{reviewDate}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.reviewStarsRow}>
                        <StarRating rating={review.stars} size={12} />
                      </View>

                      <Text style={styles.reviewText}>{review.text || 'No review comments.'}</Text>
                    </Card>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyReviews}>
                <Ionicons name="chatbubbles-outline" size={32} color="#9CA3AF" />
                <Text style={styles.emptyReviewsText}>No reviews yet</Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.stickyBottomBar}>
        <View style={styles.priceRow}>
          <Text style={styles.bottomPriceValue}>₹{companion.hourly_rate}</Text>
          <Text style={styles.bottomPriceLabel}>/hr</Text>
        </View>

        <TouchableOpacity
          style={styles.bookBtn}
          activeOpacity={0.85}
          onPress={() => {
            router.push({
              pathname: '/book/[id]',
              params: { id: companion.id }
            });
          }}
        >
          <Text style={styles.bookBtnText}>Book Now</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 110,
  },
  heroSection: {
    height: SCREEN_HEIGHT * 0.4,
    position: 'relative',
    backgroundColor: '#0F1923',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(15, 25, 35, 0.65)',
  },
  headerActions: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 25, 35, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#0F1923',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginTop: -40,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  nameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineGenderTag: {
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  genderTag_male: {
    backgroundColor: 'rgba(59, 79, 216, 0.2)',
  },
  genderTag_female: {
    backgroundColor: 'rgba(229, 57, 123, 0.2)',
  },
  genderTag_other: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
  },
  inlineGenderText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  genderText_male: {
    color: '#818CF8',
  },
  genderText_female: {
    color: '#F472B6',
  },
  genderText_other: {
    color: '#9CA3AF',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 158, 117, 0.15)',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 6,
    gap: 3,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D9E75',
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  ratingInfoText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 8,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  locationText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 6,
    fontWeight: '500',
  },
  detailsBody: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  bioText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  statBoxDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E7EB',
  },
  activitiesContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  activityPill: {
    borderWidth: 1.5,
    borderColor: '#1D9E75',
    backgroundColor: '#F0FDF4',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activityPillText: {
    fontSize: 13,
    color: '#1D9E75',
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayCell: {
    alignItems: 'center',
    gap: 6,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleAvailable: {
    backgroundColor: '#1D9E75',
  },
  dayCircleUnavailable: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  dayLetter: {
    fontSize: 13,
    fontWeight: '700',
  },
  dayLetterAvailable: {
    color: '#FFFFFF',
  },
  dayLetterUnavailable: {
    color: '#9CA3AF',
  },
  dayLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  responseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 18,
    gap: 8,
  },
  responseText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D9E75',
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewScoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0,
  },
  reviewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerMeta: {
    marginLeft: 10,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  reviewDate: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  reviewStarsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  reviewText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 8,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyReviewsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 84,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bottomPriceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D9E75',
  },
  bottomPriceLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 2,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D9E75',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  bookBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skeletonPhoto: {
    height: SCREEN_HEIGHT * 0.4,
    backgroundColor: '#E5E7EB',
  },
  skeletonCard: {
    backgroundColor: '#0F1923',
    opacity: 0.85,
  },
  skeletonPulseLine: {
    height: 16,
    width: '80%',
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  skeletonStatBox: {
    flex: 1,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  errorBtn: {
    marginTop: 24,
    width: '80%',
    maxWidth: 240,
  },
});
