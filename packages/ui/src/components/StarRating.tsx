import React from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  maxStars?: number;
  style?: StyleProp<ViewStyle>;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  size = 18,
  maxStars = 5,
  style,
}) => {
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  return (
    <View style={[styles.container, style]}>
      {stars.map((starValue) => {
        const isFilled = starValue <= Math.round(rating);
        const iconName = isFilled ? 'star' : 'star-outline';
        const iconColor = isFilled ? '#FFB000' : '#CCCCCC'; // Golden yellow for filled stars

        if (onRatingChange) {
          return (
            <TouchableOpacity
              key={starValue}
              activeOpacity={0.7}
              onPress={() => onRatingChange(starValue)}
              style={styles.starTouch}
            >
              <Ionicons name={iconName} size={size} color={iconColor} />
            </TouchableOpacity>
          );
        }

        return (
          <Ionicons
            key={starValue}
            name={iconName}
            size={size}
            color={iconColor}
            style={styles.starIcon}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTouch: {
    paddingHorizontal: 2,
  },
  starIcon: {
    marginHorizontal: 1,
  },
});
