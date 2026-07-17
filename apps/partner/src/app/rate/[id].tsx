import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { usePartnerAuthStore } from '../../store/usePartnerAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@saathi/ui';

export default function RatingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = usePartnerAuthStore();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stars, setStars] = useState(5);
  const [feedback, setFeedback] = useState('');

  // Fetch booking details on mount
  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
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
      } catch (err) {
        console.error('Error loading booking for review:', err);
        Alert.alert('Error', 'Failed to load booking details.');
        router.replace('/(tabs)/requests');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  const handleSubmit = async () => {
    if (!user || !booking) return;

    try {
      setSubmitting(true);
      const userObj = Array.isArray(booking.users) ? booking.users[0] : booking.users;

      const { error } = await supabase
        .from('reviews')
        .insert({
          booking_id: id,
          reviewer_id: user.id,
          reviewee_id: userObj.id,
          stars,
          text: feedback.trim(),
        });

      if (error) throw error;

      Alert.alert('Success', 'Thank you for your feedback!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/requests'),
        },
      ]);
    } catch (err) {
      console.error('Error submitting review:', err);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Session Ended</Text>
        <Text style={styles.subtitle}>How was your time with {userObj?.name || 'User'}?</Text>

        {/* Stars Selector */}
        <View style={styles.starsCard}>
          <Text style={styles.cardTitle}>Rate {userObj?.name || 'User'}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable key={s} onPress={() => setStars(s)}>
                <Ionicons
                  name={s <= stars ? 'star' : 'star-outline'}
                  size={42}
                  color={s <= stars ? '#ECC94B' : '#4A5568'}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Feedback text input */}
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackLabel}>Leave a review (optional)</Text>
          <TextInput
            style={styles.feedbackInput}
            placeholder="Share details about your experience..."
            placeholderTextColor="#718096"
            multiline
            numberOfLines={4}
            value={feedback}
            onChangeText={setFeedback}
            maxLength={300}
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <Button
          title={submitting ? 'Submitting...' : 'Submit Feedback'}
          onPress={handleSubmit}
          disabled={submitting}
          variant="primary"
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  starsCard: {
    backgroundColor: '#161F30',
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222F44',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackContainer: {
    width: '100%',
    marginBottom: 32,
    gap: 8,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  feedbackInput: {
    borderWidth: 1.5,
    borderColor: '#222F44',
    borderRadius: 16,
    backgroundColor: '#161F30',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 120,
  },
  submitBtn: {
    backgroundColor: '#534AB7', // Partner purple accent
    width: '100%',
  },
});
