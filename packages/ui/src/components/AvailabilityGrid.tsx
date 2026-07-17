import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8 AM to 10 PM

export interface AvailabilitySlot {
  dayIndex: number; // 0=Mon, 6=Sun
  hour: number;     // 8-22
}

interface AvailabilityGridProps {
  slots: Set<string>; // format: "dayIndex-hour"
  onToggleSlot: (key: string) => void;
  accentColor?: string;
  availableColor?: string;
}

export function AvailabilityGrid({
  slots,
  onToggleSlot,
  accentColor = '#534AB7',
  availableColor = '#C6F6D5',
}: AvailabilityGridProps) {
  return (
    <View style={styles.gridContainer}>
      {/* Day headers */}
      <View style={styles.gridRow}>
        <View style={styles.hourLabel} />
        {DAYS.map((day) => (
          <View key={day} style={[styles.dayHeader, { backgroundColor: `${accentColor}10` }]}>
            <Text style={[styles.dayHeaderText, { color: accentColor }]}>{day}</Text>
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
            const isAvail = slots.has(key);
            return (
              <Pressable
                key={key}
                style={[styles.cell, isAvail && { backgroundColor: availableColor }]}
                onPress={() => onToggleSlot(key)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    backgroundColor: '#FFFFFF',
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EDF2F7',
  },
  hourLabel: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  hourText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#A0AEC0',
  },
  dayHeader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cell: {
    flex: 1,
    aspectRatio: 1.3,
    backgroundColor: '#F7FAFC',
    borderLeftWidth: 0.5,
    borderLeftColor: '#EDF2F7',
  },
});
