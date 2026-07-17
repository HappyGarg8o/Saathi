import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Button } from './Button';
import { Ionicons } from '@expo/vector-icons';

export interface BookingCardProps {
  companionName: string;
  companionAvatar?: string | null;
  activityType: 'Coffee' | 'Dinner' | 'Movie' | 'City Walk' | 'Event Plus-One' | 'Custom';
  startTime: string; // ISO string or pre-formatted date string
  durationHours: number;
  meetingPoint: string;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  onPress?: () => void;
  onActionPress?: () => void;
  actionText?: string;
  style?: StyleProp<ViewStyle>;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  companionName,
  companionAvatar,
  activityType,
  startTime,
  durationHours,
  meetingPoint,
  totalPrice,
  status,
  onPress,
  onActionPress,
  actionText,
  style,
}) => {
  // Format Date and Time
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Status mapping to Badge color
  const getStatusVariant = (st: typeof status) => {
    switch (st) {
      case 'confirmed':
        return 'success';
      case 'active':
        return 'primary';
      case 'pending':
        return 'partner';
      case 'completed':
        return 'secondary';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <Card onPress={onPress} style={[styles.cardContainer, style]}>
      {/* Header: Avatar, Name, and Status */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar uri={companionAvatar} name={companionName} size={40} />
          <View style={styles.nameContainer}>
            <Text style={styles.nameText}>{companionName}</Text>
            <Text style={styles.subText}>Companion</Text>
          </View>
        </View>
        <Badge text={status.toUpperCase()} variant={getStatusVariant(status)} />
      </View>

      {/* Booking Details */}
      <View style={styles.divider} />

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Ionicons name="sparkles-outline" size={16} color="#666666" style={styles.detailIcon} />
          <Text style={styles.detailText}>{activityType}</Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color="#666666" style={styles.detailIcon} />
          <Text style={styles.detailText}>
            {formatDate(startTime)} • {formatTime(startTime)}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color="#666666" style={styles.detailIcon} />
          <Text style={styles.detailText}>
            {durationHours} hr{durationHours > 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="map-outline" size={16} color="#666666" style={styles.detailIcon} />
          <Text style={styles.detailText} numberOfLines={1}>
            {meetingPoint}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Footer: Price and CTA Action */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.priceLabel}>Total Price</Text>
          <Text style={styles.priceValue}>₹{totalPrice}</Text>
        </View>

        {onActionPress && actionText ? (
          <Button
            title={actionText}
            onPress={onActionPress}
            size="sm"
            variant={status === 'active' ? 'primary' : 'partner'}
            style={styles.actionBtn}
          />
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    padding: 16,
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameContainer: {
    marginLeft: 12,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
  },
  subText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 12,
  },
  detailsGrid: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 8,
    width: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#4A5568',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#718096',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D9E75',
    marginTop: 2,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
