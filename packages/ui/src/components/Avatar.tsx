import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  verified?: boolean;
  shape?: 'circle' | 'square';
  style?: StyleProp<ViewStyle>;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = '?',
  size = 48,
  verified = false,
  shape = 'circle',
  style,
}) => {
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const textContainerSize = size;
  const fontSize = size * 0.4;
  const badgeSize = size * 0.35;
  const badgeOffset = shape === 'circle' ? -size * 0.05 : -size * 0.1;
  const borderRadius = shape === 'circle' ? size / 2 : size * 0.2;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius }]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius,
              backgroundColor: '#E2E8F0',
            },
          ]}
        >
          <Text style={[styles.fallbackText, { fontSize, lineHeight: fontSize * 1.2 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}

      {verified && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              right: badgeOffset,
              bottom: badgeOffset,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={badgeSize} color="#1D9E75" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontWeight: 'bold',
    color: '#4A5568',
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
