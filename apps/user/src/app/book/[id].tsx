import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCompanionStore } from '../../store/useCompanionStore';
import { useBookingStore } from '../../store/useBookingStore';
import { Card, Input, Button, Badge } from '@saathi/ui';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuthStore } from '../../store/useAuthStore';

const ACTIVITIES = ['Coffee', 'Dinner', 'Movie', 'City Walk', 'Event Plus-One', 'Custom'] as const;
const DURATIONS = [1, 2, 3] as const;

// Generate next 5 days for the date selector
const getNextDays = () => {
  const days = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const dayNum = d.toLocaleDateString('en-IN', { day: 'numeric' });
    const month = d.toLocaleDateString('en-IN', { month: 'short' });
    days.push({
      id: `d-${i}`,
      raw: d.toISOString(),
      label: `${dayName} ${dayNum} ${month}`,
      dayNum,
      dayName,
    });
  }
  return days;
};

const TIME_SLOTS = [
  '10:00 AM', '12:00 PM', '2:00 PM', '4:00 PM', '6:00 PM', '8:00 PM', '9:30 PM'
];

export default function BookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { createBooking } = useBookingStore();
  const { user } = useAuthStore();

  const [companion, setCompanion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    const fetchCompanion = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('companions')
          .select(`*, users(id, name, avatar_url, gender)`)
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching companion:', error);
          setCompanion(null);
        } else if (data) {
          const compData = data as any;
          const userObj = Array.isArray(compData.users) ? compData.users[0] : compData.users;
          setCompanion({
            ...compData,
            name: userObj?.name || 'Anonymous',
            users: userObj,
          });
        }
      } catch (err) {
        console.error('Error fetching companion:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanion();
  }, [id]);

  // Flow State
  const [step, setStep] = useState(1); // Steps: 1, 2, 3
  
  // Step 1 State: Activity
  const [activity, setActivity] = useState<typeof ACTIVITIES[number] | null>(null);
  
  // Step 2 State: Schedule
  const [selectedDateObj, setSelectedDateObj] = useState(getNextDays()[0]);
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[3]); // Default 4:00 PM
  const [duration, setDuration] = useState<number>(2); // Default 2 hours
  const [customDuration, setCustomDuration] = useState('');
  const [showCustomDurationInput, setShowCustomDurationInput] = useState(false);

  // Step 3 State: Checkout
  const [meetingPoint, setMeetingPoint] = useState('');
  const [validationError, setValidationError] = useState('');



  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </SafeAreaView>
    );
  }

  if (!companion) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#E53E3E" />
        <Text style={styles.errorText}>Companion not found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const days = getNextDays();

  // Price calculations
  const finalDuration = showCustomDurationInput ? parseFloat(customDuration) || 1 : duration;
  const totalPrice = Math.round(companion.hourly_rate * finalDuration);
  const platformFee = Math.round(totalPrice * 0.25);
  const companionPayout = totalPrice - platformFee;

  const handleNextStep = () => {
    setValidationError('');
    if (step === 1) {
      if (!activity) {
        setValidationError('Please pick an activity type.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (showCustomDurationInput && (!customDuration || parseFloat(customDuration) <= 0)) {
        setValidationError('Please enter a valid custom duration.');
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setValidationError('');
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  // Process real Razorpay payment
  const handlePayment = async () => {
    setValidationError('');
    if (!meetingPoint.trim()) {
      setValidationError('Please enter a specific meeting point.');
      return;
    }

    setPaymentLoading(true);

    const options = {
      description: `Saathi Session - ${activity}`,
      image: 'https://i.imgur.com/3g7nmJC.png',
      currency: 'INR',
      key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
      amount: totalPrice * 100, // Razorpay takes amount in paise
      name: 'Saathi',
      prefill: {
        email: user?.email || '',
        contact: user?.phone || '',
        name: user?.name || '',
      },
      theme: { color: '#1D9E75' },
    };

    // Parse scheduled date
    const dateObj = new Date(selectedDateObj.raw);
    const timeMatch = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      dateObj.setHours(hours, minutes, 0, 0);
    }

    try {
      const data = await RazorpayCheckout.open(options);
      console.log('Payment success:', data);

      // Create booking in Supabase with payment details
      const result = await createBooking(
        companion.id,
        activity!,
        dateObj.toISOString(),
        finalDuration,
        meetingPoint.trim(),
        companion.hourly_rate,
        companion.users?.name || companion.name,
        companion.users?.avatar_url || null,
        data.razorpay_payment_id // pass payment ID
      );

      if (result?.success || result?.id) {
        router.replace({
          pathname: '/booking-confirmation/[id]',
          params: { id: result.bookingId || result.id }
        });
      } else {
        Alert.alert('Booking Error', 'Payment was successful, but booking could not be saved. Please contact support.');
      }
    } catch (error: any) {
      console.log('Payment error:', error);
      if (error.code === 2) {
        Alert.alert('Payment Cancelled', 'You cancelled the payment.');
      } else {
        Alert.alert('Payment Failed', error.description || 'Payment could not be processed.');
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={handlePrevStep} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Book {companion.name}</Text>
        <Text style={styles.stepIndicator}>Step {step}/3</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* STEP 1: PICK ACTIVITY */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Select Social Activity</Text>
              <Text style={styles.stepSubtitle}>
                Saathi is strictly for social gatherings. Please pick the activity you will enjoy together.
              </Text>

              {validationError ? <Text style={styles.errorTextInline}>{validationError}</Text> : null}

              <View style={styles.activitiesGrid}>
                {ACTIVITIES.map((act) => {
                  const isSelected = activity === act;
                  return (
                    <TouchableOpacity
                      key={act}
                      activeOpacity={0.8}
                      onPress={() => {
                        setActivity(act);
                        setValidationError('');
                      }}
                      style={[styles.activityCard, isSelected && styles.selectedActivityCard]}
                    >
                      <Ionicons
                        name={
                          act === 'Coffee'
                            ? 'cafe'
                            : act === 'Dinner'
                            ? 'restaurant'
                            : act === 'Movie'
                            ? 'film'
                            : act === 'City Walk'
                            ? 'footsteps'
                            : act === 'Event Plus-One'
                            ? 'ticket'
                            : 'sparkles'
                        }
                        size={28}
                        color={isSelected ? '#FFFFFF' : '#1D9E75'}
                      />
                      <Text style={[styles.activityLabel, isSelected && styles.selectedActivityLabel]}>
                        {act}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* STEP 2: SCHEDULING */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Choose Date & Time</Text>
              <Text style={styles.stepSubtitle}>Select when and for how long you want to book.</Text>

              {validationError ? <Text style={styles.errorTextInline}>{validationError}</Text> : null}

              {/* Date Horizontal Row */}
              <Text style={styles.inputLabel}>Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
                {days.map((d) => {
                  const isSelected = selectedDateObj.id === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      activeOpacity={0.8}
                      onPress={() => setSelectedDateObj(d)}
                      style={[styles.dateCard, isSelected && styles.selectedDateCard]}
                    >
                      <Text style={[styles.dateDayName, isSelected && styles.selectedDateText]}>
                        {d.dayName}
                      </Text>
                      <Text style={[styles.dateDayNum, isSelected && styles.selectedDateText]}>
                        {d.dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Time Horizontal Row */}
              <Text style={styles.inputLabel}>Start Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRow}>
                {TIME_SLOTS.map((t) => {
                  const isSelected = selectedTime === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      activeOpacity={0.8}
                      onPress={() => setSelectedTime(t)}
                      style={[styles.timePill, isSelected && styles.selectedTimePill]}
                    >
                      <Text style={[styles.timeText, isSelected && styles.selectedTimeText]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Duration Select */}
              <Text style={styles.inputLabel}>Duration</Text>
              <View style={styles.durationRow}>
                {DURATIONS.map((dur) => {
                  const isSelected = duration === dur && !showCustomDurationInput;
                  return (
                    <TouchableOpacity
                      key={dur}
                      activeOpacity={0.8}
                      onPress={() => {
                        setDuration(dur);
                        setShowCustomDurationInput(false);
                        setValidationError('');
                      }}
                      style={[styles.durationPill, isSelected && styles.selectedDurationPill]}
                    >
                      <Text style={[styles.durationText, isSelected && styles.selectedDurationText]}>
                        {dur} hr{dur > 1 ? 's' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowCustomDurationInput(true);
                    setValidationError('');
                  }}
                  style={[styles.durationPill, showCustomDurationInput && styles.selectedDurationPill]}
                >
                  <Text style={[styles.durationText, showCustomDurationInput && styles.selectedDurationText]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {showCustomDurationInput && (
                <Input
                  label="Enter hours (e.g. 1.5, 4)"
                  placeholder="2.5"
                  keyboardType="numeric"
                  value={customDuration}
                  onChangeText={(text) => {
                    setCustomDuration(text);
                    if (validationError) setValidationError('');
                  }}
                  containerStyle={styles.customDurationInput}
                />
              )}
            </View>
          )}

          {/* STEP 3: CHECKOUT */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Confirm details & Pay</Text>
              <Text style={styles.stepSubtitle}>Review meeting details and complete checkout.</Text>

              {validationError ? <Text style={styles.errorTextInline}>{validationError}</Text> : null}

              {/* Booking Summary Card */}
              <Card style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Booking Summary</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Companion</Text>
                    <Text style={styles.summaryValue}>{companion.name}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Activity</Text>
                    <Text style={styles.summaryValue}>{activity}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Date & Time</Text>
                    <Text style={styles.summaryValue}>
                      {selectedDateObj.label} @ {selectedTime}
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Duration</Text>
                    <Text style={styles.summaryValue}>
                      {finalDuration} hour{finalDuration > 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Location Input */}
              <Input
                label="Meeting Point (Exact Location)"
                placeholder="E.g., Starbuck's, Indiranagar 100ft road"
                value={meetingPoint}
                onChangeText={(text) => {
                  setMeetingPoint(text);
                  if (validationError) setValidationError('');
                }}
              />

              {/* Price Breakdown */}
              <View style={styles.priceSection}>
                <Text style={styles.summaryTitle}>Price Details</Text>
                <View style={styles.priceRowItem}>
                  <Text style={styles.priceLabelItem}>Hourly Booking Fee</Text>
                  <Text style={styles.priceValueItem}>₹{companion.hourly_rate} x {finalDuration} hrs</Text>
                </View>
                
                <View style={styles.divider} />

                <View style={styles.priceRowItem}>
                  <Text style={styles.priceLabelItemBold}>Total Price (GST Incl.)</Text>
                  <Text style={styles.priceValueItemBold}>₹{totalPrice}</Text>
                </View>

                {/* Transparency display */}
                <View style={styles.feeBreakdown}>
                  <View style={styles.feeBreakdownRow}>
                    <Ionicons name="business-outline" size={14} color="#718096" />
                    <Text style={styles.feeBreakdownText}>Platform fee (25% commission): ₹{platformFee}</Text>
                  </View>
                  <View style={styles.feeBreakdownRow}>
                    <Ionicons name="wallet-outline" size={14} color="#718096" />
                    <Text style={styles.feeBreakdownText}>Companion payout (75% earnings): ₹{companionPayout}</Text>
                  </View>
                </View>
              </View>

              {__DEV__ && (
                <View style={styles.testModeBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#B7791F" />
                  <View style={styles.testModeTextContainer}>
                    <Text style={styles.testModeTitle}>Test Mode</Text>
                    <Text style={styles.testModeDesc}>
                      Use card: <Text style={styles.boldText}>4111 1111 1111 1111</Text>
                      {"\n"}Expiry: any future date, CVV: any 3 digits
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Navigation */}
      <View style={styles.navigationFooter}>
        {step < 3 ? (
          <Button
            title="Next Step"
            onPress={handleNextStep}
            variant="primary"
            style={styles.fullBtn}
          />
        ) : (
          <Button
            title={`Pay ₹${totalPrice} via Razorpay`}
            onPress={handlePayment}
            loading={paymentLoading}
            variant="primary"
            style={styles.fullBtn}
          />
        )}
      </View>
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
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#718096',
    marginVertical: 16,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  iconBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D9E75',
    backgroundColor: '#E1F5EE',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 1.5,
    marginBottom: 24,
  },
  errorTextInline: {
    color: '#E53E3E',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  // Step 1 grid
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  selectedActivityCard: {
    backgroundColor: '#1D9E75',
    borderColor: '#1D9E75',
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  selectedActivityLabel: {
    color: '#FFFFFF',
  },
  // Step 2 schedules
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4A5568',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRow: {
    paddingBottom: 4,
    gap: 8,
  },
  dateCard: {
    width: 72,
    height: 72,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectedDateCard: {
    backgroundColor: '#1D9E75',
    borderColor: '#1D9E75',
  },
  dateDayName: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  dateDayNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
    marginTop: 4,
  },
  selectedDateText: {
    color: '#FFFFFF',
  },
  timeRow: {
    paddingBottom: 4,
    gap: 8,
  },
  timePill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  selectedTimePill: {
    backgroundColor: '#1D9E75',
    borderColor: '#1D9E75',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A5568',
  },
  selectedTimeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durationPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  selectedDurationPill: {
    backgroundColor: '#1D9E75',
    borderColor: '#1D9E75',
  },
  durationText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A5568',
  },
  selectedDurationText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  customDurationInput: {
    marginTop: 8,
  },
  // Step 3 Checkout
  summaryCard: {
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 12,
  },
  summaryGrid: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#718096',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A202C',
  },
  priceSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  priceRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabelItem: {
    fontSize: 13,
    color: '#4A5568',
  },
  priceValueItem: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A202C',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  priceLabelItemBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
  },
  priceValueItemBold: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1D9E75',
  },
  feeBreakdown: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  feeBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feeBreakdownText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  navigationFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    padding: 16,
  },
  fullBtn: {
    width: '100%',
  },
  // Test Mode Box
  testModeBox: {
    flexDirection: 'row',
    backgroundColor: '#FEFCBF',
    borderWidth: 1,
    borderColor: '#FEEBC8',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  testModeTextContainer: {
    flex: 1,
  },
  testModeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B7791F',
  },
  testModeDesc: {
    fontSize: 12,
    color: '#744210',
    marginTop: 2,
    lineHeight: 16,
  },
  boldText: {
    fontWeight: 'bold',
  },
});
