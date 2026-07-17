import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Companion } from '../../store/useCompanionStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Card, Avatar, StarRating } from '@saathi/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [companions, setCompanions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    gender: 'all' as 'all' | 'male' | 'female' | 'other',
    activity: 'all' as 'all' | 'Coffee' | 'Dinner' | 'Movie' | 'City Walk' | 'Event Plus-One',
    maxPrice: 2000,
  });

  const shimmerOpacity = React.useRef(new Animated.Value(0.4)).current;

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

  let filteredCompanions: any[] = [];
  try {
    filteredCompanions = companions.filter((item) => {
      if (!item) return false;

      const gender = item.users?.gender ?? item.gender ?? 'other';
      const activities = item.activity_tags ?? item.activities ?? [];
      const hourlyRate = item.hourly_rate ?? 0;

      if (filters.gender !== 'all' && gender !== filters.gender) {
        return false;
      }
      if (filters.activity !== 'all' && !activities.includes(filters.activity)) {
        return false;
      }
      if (hourlyRate > filters.maxPrice) {
        return false;
      }
      return true;
    });
  } catch (err) {
    console.error('Error in companions.filter:', err);
    filteredCompanions = [];
  }

  const setFilter = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      gender: 'all',
      activity: 'all',
      maxPrice: 2000,
    });
  };

  const fetchCompanions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('companions')
        .select(`
          *,
          users (
            id,
            name,
            avatar_url,
            gender
          )
        `)
        .eq('is_active', true)
        .order('rating_avg', { ascending: false });
        
      if (error) {
        console.error(error);
        setError('Could not connect to database');
      } else {
        const mapped: Companion[] = (data || []).map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          name: item.users?.name || 'Anonymous',
          gender: item.users?.gender || 'other',
          avatar_url: item.users?.avatar_url || 'https://via.placeholder.com/150',
          aadhaar_verified: item.aadhaar_verified,
          bio: item.bio || '',
          hourly_rate: item.hourly_rate,
          rating_avg: parseFloat(item.rating_avg || '5.0'),
          total_sessions: item.total_sessions || 0,
          is_active: item.is_active,
          city: item.city || 'India',
          service_radius_km: item.service_radius_km || 10,
          activity_tags: item.activity_tags || item.activities || ['Coffee', 'Dinner'],
        }));
        setCompanions(mapped);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch companions');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filters change
  useEffect(() => {
    fetchCompanions();
  }, [filters.gender, filters.activity, filters.maxPrice]);

  const handleGenderSelect = (gender: 'all' | 'male' | 'female' | 'other') => {
    setFilter('gender', gender);
  };

  const handleActivitySelect = (activity: typeof filters.activity) => {
    setFilter('activity', activity);
  };

  const handlePriceSelect = (maxPrice: number) => {
    setFilter('maxPrice', maxPrice);
  };

  const SkeletonCard = () => (
    <Card style={styles.companionCard}>
      <View style={styles.cardContent}>
        {/* Left Side: Avatar Placeholder */}
        <Animated.View style={[styles.avatarPlaceholder, { opacity: shimmerOpacity }]} />
        
        {/* Right Side: Details Placeholder */}
        <View style={styles.companionMainInfo}>
          <View style={styles.skeletonRow}>
            <Animated.View style={[styles.skeletonTextName, { opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.skeletonTextTag, { opacity: shimmerOpacity }]} />
          </View>
          
          <Animated.View style={[styles.skeletonRatingPlaceholder, { opacity: shimmerOpacity }]} />
          
          <Animated.View style={[styles.skeletonBadgePlaceholder, { opacity: shimmerOpacity }]} />
          
          <View style={styles.cardFooter}>
            <View style={styles.tagsContainer}>
              <Animated.View style={[styles.skeletonTagPill, { opacity: shimmerOpacity }]} />
              <Animated.View style={[styles.skeletonTagPill, { opacity: shimmerOpacity }]} />
            </View>
            
            <Animated.View style={[styles.skeletonPricePlaceholder, { opacity: shimmerOpacity }]} />
          </View>
        </View>
      </View>
    </Card>
  );

  const renderCompanionCard = ({ item }: { item: any }) => {
    const companionName = item.users?.name ?? item.name ?? 'Unknown';
    const companionGender = item.users?.gender ?? item.gender ?? 'other';
    const companionAvatar = item.users?.avatar_url ?? item.avatar_url ?? null;
    const companionActivities = item.activity_tags ?? item.activities ?? [];
    const ratingAvg = item.rating_avg ?? 0;
    const totalSessions = item.total_sessions ?? 0;
    const hourlyRate = item.hourly_rate ?? 0;

    return (
      <Card
        style={styles.companionCard}
        onPress={() => router.push(`/companion/${item.id}`)}
      >
        <View style={styles.cardContent}>
          {/* Left Side: Avatar */}
          <View style={styles.avatarContainer}>
            <Avatar 
              uri={companionAvatar} 
              name={companionName} 
              size={80} 
              shape="square"
              verified={item.aadhaar_verified} 
            />
          </View>
          
          {/* Right Side: Details */}
          <View style={styles.companionMainInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.companionName} numberOfLines={1}>{companionName}</Text>
              
              {/* Gender Tag - Soft colors */}
              <View style={[styles.genderTag, styles[`genderTag_${companionGender}` as keyof typeof styles] as any]}>
                <Ionicons
                  name={companionGender === 'male' ? 'male' : companionGender === 'female' ? 'female' : 'transgender'}
                  size={10}
                  color={companionGender === 'male' ? '#3B4FD8' : companionGender === 'female' ? '#E5397B' : '#6B7280'}
                />
                <Text style={[styles.genderText, styles[`genderText_${companionGender}` as keyof typeof styles] as any]}>
                  {companionGender.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Rating and total sessions */}
            <View style={styles.ratingRow}>
              <StarRating rating={ratingAvg} size={12} />
              <Text style={styles.ratingText}>
                {ratingAvg.toFixed(1)} ({totalSessions} sessions)
              </Text>
            </View>

            {/* Availability badge */}
            {item.is_active && (
              <View style={styles.availabilityBadge}>
                <View style={styles.availabilityDot} />
                <Text style={styles.availabilityText}>Available today</Text>
              </View>
            )}

            {/* Activities and Price Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.tagsContainer}>
                {companionActivities.slice(0, 2).map((tag: string) => (
                  <View key={tag} style={styles.activityPill}>
                     <Text style={styles.activityPillText}>{tag}</Text>
                  </View>
                ))}
                {companionActivities.length > 2 && (
                  <View style={styles.activityPill}>
                     <Text style={styles.activityPillText}>+{companionActivities.length - 2}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceValue}>₹{hourlyRate}</Text>
                <Text style={styles.priceLabel}>/hr</Text>
              </View>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header: Dark Premium Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>Hello, {user?.display_name || user?.name || 'Friend'} 👋</Text>
          <Text style={styles.headerTitle}>Find Your Saathi</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={12} color="#9CA3AF" />
            <Text style={styles.locationText}>{user?.city || 'India'}</Text>
          </View>
        </View>
        <Avatar uri={user?.avatar_url} name={user?.name || 'U'} size={44} shape="circle" />
      </View>

      <View style={styles.pageContent}>
        {/* Filter Section */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Explore Companions</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Ionicons name="options-outline" size={20} color="#1D9E75" />
            </TouchableOpacity>
          </View>

          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {/* Activity Filters */}
              {(['all', 'Coffee', 'Dinner', 'Movie', 'City Walk', 'Event Plus-One'] as const).map((act) => (
                <TouchableOpacity
                  key={act}
                  onPress={() => handleActivitySelect(act)}
                  style={[styles.filterPill, filters.activity === act && styles.activePill]}
                >
                  <Text style={[styles.filterPillText, filters.activity === act && styles.activePillText]}>
                    {act === 'all' ? 'All Activities' : act}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Main List */}
        {loading ? (
          <FlatList
            data={[1, 2, 3, 4]}
            renderItem={() => <SkeletonCard />}
            keyExtractor={(item) => item.toString()}
            contentContainerStyle={styles.listContent}
          />
        ) : error && filteredCompanions.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="cloud-offline-outline" size={64} color="#D1D5DB" />
            <Text style={styles.errorText}>Could not connect to database</Text>
            <TouchableOpacity onPress={fetchCompanions} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry Fetch</Text>
            </TouchableOpacity>
          </View>
        ) : (!loading && filteredCompanions.length === 0) ? (
          <View style={styles.centered}>
            <Ionicons name="search" size={64} color="#D1D5DB" />
            <Text style={styles.noResultsTitle}>No companions found</Text>
            <Text style={styles.noResultsText}>We couldn't find any companions matching your exact filters right now.</Text>
            <TouchableOpacity onPress={resetFilters} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredCompanions}
            renderItem={renderCompanionCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1923', // Match header background for safe area
  },
  pageContent: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0F1923',
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 4,
    fontWeight: '500',
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F7F8FA',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  horizontalScroll: {
    paddingBottom: 4,
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activePill: {
    backgroundColor: '#1D9E75',
    borderColor: '#1D9E75',
  },
  filterPillText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  activePillText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    gap: 16,
  },
  companionCard: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  companionMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  companionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  genderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 6,
    gap: 4,
  },
  genderTag_male: {
    backgroundColor: '#EEF2FF',
  },
  genderTag_female: {
    backgroundColor: '#FFF0F3',
  },
  genderTag_other: {
    backgroundColor: '#F3F4F6',
  },
  genderText: {
    fontSize: 10,
    fontWeight: '700',
  },
  genderText_male: {
    color: '#3B4FD8',
  },
  genderText_female: {
    color: '#E5397B',
  },
  genderText_other: {
    color: '#6B7280',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
    marginRight: 8,
  },
  activityPill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  activityPillText: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D9E75',
  },
  priceLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  noResultsTitle: {
    marginTop: 16,
    fontSize: 18,
    color: '#111827',
    fontWeight: '700',
  },
  noResultsText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 24,
    backgroundColor: '#1D9E75',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1D9E75',
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D9E75',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginRight: 16,
  },
  skeletonTextName: {
    height: 16,
    width: 120,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonTextTag: {
    height: 16,
    width: 50,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonRatingPlaceholder: {
    height: 12,
    width: 100,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  skeletonBadgePlaceholder: {
    height: 12,
    width: 80,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  skeletonTagPill: {
    height: 18,
    width: 60,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonPricePlaceholder: {
    height: 20,
    width: 50,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

