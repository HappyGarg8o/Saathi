import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEarningsStore } from '../../store/useEarningsStore';
import { Ionicons } from '@expo/vector-icons';

export default function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const {
    totalEarned,
    availableBalance,
    pendingPayout,
    payoutHistory,
    sessionEarnings,
    weeklyEarnings,
    loading,
    error,
    fetchEarnings,
    requestPayout,
  } = useEarningsStore();

  const [showPayoutSheet, setShowPayoutSheet] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    fetchEarnings();
  }, []);

  const handlePayout = async () => {
    const amount = parseInt(payoutAmount, 10);
    if (!amount || !upiId) {
      Alert.alert('Error', 'Please enter a valid amount and UPI ID');
      return;
    }
    const success = await requestPayout(amount, upiId);
    if (success) {
      setShowPayoutSheet(false);
      setPayoutAmount('');
      Alert.alert('Success! 🎉', `₹${amount} sent to ${upiId}`);
    } else if (error) {
      Alert.alert('Payout Failed', error);
    }
  };

  const maxWeekly = Math.max(...weeklyEarnings, 1);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Earnings</Text>

        {/* Stats cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statLabel}>Available</Text>
            <Text style={styles.statAmount}>₹{availableBalance.toLocaleString('en-IN')}</Text>
            <Pressable style={styles.payoutBtn} onPress={() => setShowPayoutSheet(true)}>
              <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
              <Text style={styles.payoutBtnText}>Request Payout</Text>
            </Pressable>
          </View>
          <View style={styles.statCardGroup}>
            <View style={styles.statCardSmall}>
              <Text style={styles.statSmallLabel}>Total Earned</Text>
              <Text style={styles.statSmallAmount}>₹{totalEarned.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.statCardSmall}>
              <Text style={styles.statSmallLabel}>Sessions</Text>
              <Text style={styles.statSmallAmount}>{sessionEarnings.length}</Text>
            </View>
          </View>
        </View>

        {/* Weekly chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Weekly Earnings</Text>
          <View style={styles.chartContainer}>
            {weeklyEarnings.map((amount, i) => (
              <View key={i} style={styles.barWrapper}>
                <Text style={styles.barAmount}>₹{amount}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max((amount / maxWeekly) * 100, 8)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>
                  {i === 0 ? 'This wk' : i === 1 ? 'Last wk' : `${i + 1}w ago`}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Session history */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Session History</Text>
          {sessionEarnings.map((session) => (
            <View key={session.id} style={styles.historyCard}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyName}>{session.user_name}</Text>
                <View style={styles.historyMeta}>
                  <Ionicons name="cafe" size={12} color="#718096" />
                  <Text style={styles.historyActivity}>{session.activity_type}</Text>
                  <Text style={styles.historyDot}>•</Text>
                  <Text style={styles.historyDate}>{formatDate(session.completed_at)}</Text>
                  <Text style={styles.historyDot}>•</Text>
                  <Text style={styles.historyDuration}>{session.duration_hours}h</Text>
                </View>
              </View>
              <Text style={styles.historyAmount}>+₹{session.companion_payout}</Text>
            </View>
          ))}
        </View>

        {/* Payout history */}
        {payoutHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Payout History</Text>
            {payoutHistory.map((payout) => (
              <View key={payout.id} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyName}>Payout to {payout.upiId}</Text>
                  <View style={styles.historyMeta}>
                    <Ionicons name="arrow-up" size={12} color="#E53E3E" />
                    <Text style={styles.historyDate}>{formatDate(payout.created_at)}</Text>
                    <View style={[
                      styles.statusBadge,
                      payout.status === 'completed' ? styles.statusCompleted : styles.statusProcessing,
                    ]}>
                      <Text style={[
                        styles.statusText,
                        payout.status === 'completed' ? styles.statusTextCompleted : styles.statusTextProcessing,
                      ]}>
                        {payout.status}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.historyAmountRed}>-₹{payout.amount}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Payout bottom sheet */}
      {showPayoutSheet && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowPayoutSheet(false)} />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Request Payout</Text>
            <Text style={styles.sheetBalance}>Available: ₹{availableBalance.toLocaleString('en-IN')}</Text>

            <View style={styles.sheetField}>
              <Text style={styles.sheetFieldLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.sheetInput}
                placeholder="Enter amount"
                placeholderTextColor="#A0AEC0"
                keyboardType="number-pad"
                value={payoutAmount}
                onChangeText={setPayoutAmount}
              />
            </View>

            <View style={styles.sheetField}>
              <Text style={styles.sheetFieldLabel}>UPI ID</Text>
              <TextInput
                style={styles.sheetInput}
                placeholder="e.g. name@upi"
                placeholderTextColor="#A0AEC0"
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
              />
            </View>

            <Pressable
              style={[styles.sheetPayBtn, (loading || pendingPayout > 0) && styles.sheetPayBtnDisabled]}
              onPress={handlePayout}
              disabled={loading || pendingPayout > 0}
            >
              {pendingPayout > 0 ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.sheetPayBtnText}>Processing...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.sheetPayBtnText}>Send to UPI</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1.2,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  statCardPrimary: {
    backgroundColor: '#534AB7',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  statAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  payoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  payoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statCardGroup: {
    flex: 1,
    gap: 12,
  },
  statCardSmall: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statSmallLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  statSmallAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
    gap: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barAmount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#718096',
  },
  barTrack: {
    width: '70%',
    height: 100,
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#534AB7',
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#A0AEC0',
  },
  historySection: {
    marginBottom: 24,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  historyLeft: {
    flex: 1,
    gap: 4,
  },
  historyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  historyActivity: {
    fontSize: 12,
    color: '#718096',
  },
  historyDot: {
    fontSize: 12,
    color: '#CBD5E0',
  },
  historyDate: {
    fontSize: 12,
    color: '#718096',
  },
  historyDuration: {
    fontSize: 12,
    color: '#718096',
  },
  historyAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#38A169',
  },
  historyAmountRed: {
    fontSize: 17,
    fontWeight: '800',
    color: '#E53E3E',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginLeft: 4,
  },
  statusCompleted: {
    backgroundColor: '#C6F6D5',
  },
  statusProcessing: {
    backgroundColor: '#FEEBC8',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusTextCompleted: {
    color: '#38A169',
  },
  statusTextProcessing: {
    color: '#DD6B20',
  },
  // Payout sheet
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
  },
  sheetBalance: {
    fontSize: 14,
    color: '#718096',
  },
  sheetField: {
    gap: 6,
  },
  sheetFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  sheetInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A202C',
    backgroundColor: '#F7FAFC',
  },
  sheetPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#534AB7',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  sheetPayBtnDisabled: {
    backgroundColor: '#A0AEC0',
  },
  sheetPayBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
