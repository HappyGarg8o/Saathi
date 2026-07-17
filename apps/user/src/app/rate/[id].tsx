import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBookingStore } from '../../store/useBookingStore';
import { Card, Avatar, Button, StarRating, Input } from '@saathi/ui';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

export default function RateSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { submitReview, loading: submitting } = useBookingStore();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(5);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    const loadBooking = async () => {
      if (!id) return;
      setLoading(true);
      try {
        let found = null;
        if (id.startsWith('mock-booking-')) {
          const stored = await AsyncStorage.getItem('mock_bookings');
          const parsed = stored ? JSON.parse(stored) : [];
          found = parsed.find((b: any) => b.id === id);
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
            found = {
              ...data,
              companion: {
                name: comp?.name || 'Companion',
                avatar_url: comp?.avatar_url || null,
              }
            };
          }
        }
        if (found) {
          setBooking(found);
        }
      } catch (err) {
        console.error('Error loading booking for rating:', err);
      } finally {
        setLoading(false);
      }
    };
    loadBooking();
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;
    try {
      const success = await submitReview(id, stars, reviewText.trim());
      if (success) {
        // Save rating to mock local ratings map as well so bookings list renders it immediately
        try {
          const savedRatings = await AsyncStorage.getItem('mock_ratings');
          const ratingsMap = savedRatings ? JSON.parse(savedRatings) : {};
          ratingsMap[id] = stars;
          await AsyncStorage.setItem('mock_ratings', JSON.stringify(ratingsMap));
        } catch (err) {
          console.error('Error saving local rating:', err);
        }

        Alert.alert('Thank You', 'Your review has been submitted successfully!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/bookings') }
        ]);
      } else {
        Alert.alert('Error', 'Failed to submit review. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)/bookings');
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
        <Text style={styles.errorText}>Booking not found</Text>
        <Button title="Go to Bookings" onPress={() => router.replace('/(tabs)/bookings')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>How was your session?</Text>
          <Text style={styles.subtitle}>Help us improve Saathi experience</Text>
        </View>

        <Card style={styles.profileCard}>
          <Avatar uri={booking.companion?.avatar_url} name={booking.companion?.name} size={96} shape="circle" />
          <Text style={styles.companionName}>{booking.companion?.name}</Text>
          <Text style={styles.activityLabel}>🤝 {booking.activity_type}</Text>
        </Card>

        <Card style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>Tap to Rate</Text>
          <StarRating rating={stars} onRatingChange={setStars} size={40} style={styles.stars} />
          <Text style={styles.ratingValueText}>{stars} / 5 stars</Text>

          <Input
            label="Share your feedback (optional)"
            placeholder="Write a private note about your conversation or time together..."
            multiline
            numberOfLines={4}
            value={reviewText}
            onChangeText={setReviewText}
            style={styles.reviewInput}
          />

          <Button
            title="Submit Rating"
            onPress={handleSubmit}
            loading={submitting}
            variant="primary"
            style={styles.submitBtn}
          />

          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipBtnText}>Skip Rating</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F7F8FA',
  },
  errorText: {
    fontSize: 16,
    color: '#718096',
    marginVertical: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A202C',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  companionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    marginTop: 12,
  },
  activityLabel: {
    fontSize: 13,
    color: '#1D9E75',
    fontWeight: '600',
    marginTop: 4,
  },
  ratingCard: {
    padding: 20,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 12,
  },
  stars: {
    marginBottom: 12,
  },
  ratingValueText: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '700',
    marginBottom: 20,
  },
  reviewInput: {
    fontSize: 14,
    height: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    width: '100%',
    marginTop: 8,
  },
  skipBtn: {
    marginTop: 16,
    padding: 8,
  },
  skipBtnText: {
    color: '#718096',
    fontSize: 14,
    fontWeight: '600',
  },
});
