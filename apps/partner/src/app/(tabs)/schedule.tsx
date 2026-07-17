import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM

type SlotKey = string; // format: "day-hour" e.g. "0-9" = Monday 9AM

const DEFAULT_AVAILABLE: Set<string> = new Set([
  // Weekday evenings (5-9 PM)
  ...DAYS.slice(0, 5).flatMap((_, dayIdx) =>
    [17, 18, 19, 20, 21].map((h) => `${dayIdx}-${h}`)
  ),
  // Weekend all day
  ...DAYS.slice(5).flatMap((_, i) =>
    HOURS.map((h) => `${i + 5}-${h}`)
  ),
]);

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const [available, setAvailable] = useState<Set<string>>(new Set(DEFAULT_AVAILABLE));

  const toggleSlot = useCallback((key: SlotKey) => {
    setAvailable((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const setAllAvailable = () => {
    const all = new Set<string>();
    DAYS.forEach((_, dayIdx) => {
      HOURS.forEach((h) => all.add(`${dayIdx}-${h}`));
    });
    setAvailable(all);
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Remove all availability slots?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setAvailable(new Set()) },
    ]);
  };

  const totalSlots = available.size;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Schedule</Text>
        <Text style={styles.headerSubtitle}>{totalSlots} hours available this week</Text>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <Pressable style={styles.quickBtn} onPress={setAllAvailable}>
          <Ionicons name="checkbox-outline" size={16} color="#534AB7" />
          <Text style={styles.quickBtnText}>Set All Available</Text>
        </Pressable>
        <Pressable style={[styles.quickBtn, styles.quickBtnDanger]} onPress={clearAll}>
          <Ionicons name="trash-outline" size={16} color="#E53E3E" />
          <Text style={[styles.quickBtnText, styles.quickBtnTextDanger]}>Clear All</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#C6F6D5' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EDF2F7' }]} />
            <Text style={styles.legendText}>Unavailable</Text>
          </View>
        </View>

        {/* Grid */}
        <View style={styles.gridContainer}>
          {/* Header row (days) */}
          <View style={styles.gridRow}>
            <View style={styles.hourLabel} />
            {DAYS.map((day) => (
              <View key={day} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Time rows */}
          {HOURS.map((hour) => (
            <View key={hour} style={styles.gridRow}>
              <View style={styles.hourLabel}>
                <Text style={styles.hourText}>
                  {hour > 12 ? `${hour - 12}PM` : hour === 12 ? '12PM' : `${hour}AM`}
                </Text>
              </View>
              {DAYS.map((_, dayIdx) => {
                const key = `${dayIdx}-${hour}`;
                const isAvail = available.has(key);
                return (
                  <Pressable
                    key={key}
                    style={[styles.cell, isAvail && styles.cellAvailable]}
                    onPress={() => toggleSlot(key)}
                  >
                    {isAvail && (
                      <Ionicons name="checkmark" size={10} color="#38A169" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Tip */}
        <View style={styles.tipBox}>
          <Ionicons name="information-circle" size={18} color="#534AB7" />
          <Text style={styles.tipText}>
            Tap cells to toggle availability. Users can only book you during green slots.
          </Text>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#EEEDFE',
  },
  quickBtnDanger: {
    backgroundColor: '#FFF5F5',
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#534AB7',
  },
  quickBtnTextDanger: {
    color: '#E53E3E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  gridContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EDF2F7',
  },
  hourLabel: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  hourText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#A0AEC0',
  },
  dayHeader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#EEEDFE',
  },
  dayHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#534AB7',
  },
  cell: {
    flex: 1,
    aspectRatio: 1.3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderLeftWidth: 0.5,
    borderLeftColor: '#EDF2F7',
  },
  cellAvailable: {
    backgroundColor: '#C6F6D5',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EEEDFE',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  tipText: {
    fontSize: 13,
    color: '#534AB7',
    flex: 1,
    lineHeight: 18,
  },
});
