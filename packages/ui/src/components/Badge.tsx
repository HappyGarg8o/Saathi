import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';

export interface BadgeProps {
  text: string;
  variant?: 'primary' | 'partner' | 'secondary' | 'success' | 'danger';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'secondary',
  style,
  textStyle,
}) => {
  return (
    <View style={[styles.badge, styles[variant], style]}>
      <Text style={[styles.text, styles[`text_${variant}` as keyof typeof styles] as TextStyle, textStyle]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999, // Pill shape
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#E1F5EE',
  },
  partner: {
    backgroundColor: '#EEEDFE',
  },
  secondary: {
    backgroundColor: '#F3F4F6',
  },
  success: {
    backgroundColor: '#DEF7EC',
  },
  danger: {
    backgroundColor: '#FDE8E8',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  text_primary: {
    color: '#0F6E56',
  },
  text_partner: {
    color: '#534AB7',
  },
  text_secondary: {
    color: '#4B5563',
  },
  text_success: {
    color: '#03543F',
  },
  text_danger: {
    color: '#9B1C1C',
  },
});
