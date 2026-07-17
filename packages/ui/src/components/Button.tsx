import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'partner' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
}) => {
  const isDarkText = variant === 'outline' || variant === 'secondary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isDarkText ? '#333333' : '#FFFFFF'}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`text_${size}` as keyof typeof styles] as TextStyle,
            isDarkText ? styles.textDark : styles.textLight,
            disabled && styles.textDisabled,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8, // Pill shape can override, but general default
    flexDirection: 'row',
  },
  // Variants
  primary: {
    backgroundColor: '#1D9E75',
  },
  partner: {
    backgroundColor: '#534AB7',
  },
  secondary: {
    backgroundColor: '#F0F0F0',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  danger: {
    backgroundColor: '#E53E3E',
  },
  // Sizes
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  // States
  disabled: {
    backgroundColor: '#E0E0E0',
    borderColor: '#D0D0D0',
  },
  // Text Styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
  textLight: {
    color: '#FFFFFF',
  },
  textDark: {
    color: '#333333',
  },
  textDisabled: {
    color: '#888888',
  },
});
