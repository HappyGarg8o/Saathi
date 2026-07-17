import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePartnerAuthStore } from '../store/usePartnerAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@saathi/ui';

type VerifyStage = 'input' | 'connecting' | 'verifying' | 'success';

export default function AadhaarVerifyScreen() {
  const insets = useSafeAreaInsets();
  const { verifyAadhaar, loading, error, clearError } = usePartnerAuthStore();
  const [aadhaar, setAadhaar] = useState('');
  const [stage, setStage] = useState<VerifyStage>('input');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  // Spinner rotation
  useEffect(() => {
    if (stage === 'connecting' || stage === 'verifying') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [stage]);

  const formatAadhaar = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleVerify = async () => {
    clearError();

    // Stage 1: Connecting
    setStage('connecting');
    await new Promise((r) => setTimeout(r, 1200));

    // Stage 2: Verifying
    setStage('verifying');

    const success = await verifyAadhaar(aadhaar.replace(/\s/g, ''));

    if (success) {
      setStage('success');
      Animated.spring(successScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }).start();
      // Navigation is handled by nav guard
    } else {
      setStage('input');
    }
  };

  const isValid = aadhaar.replace(/\s/g, '').length === 12;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (stage !== 'input') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.verifyingCenter}>
          {stage === 'success' ? (
            <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
              <Ionicons name="checkmark" size={48} color="#FFFFFF" />
            </Animated.View>
          ) : (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="sync" size={48} color="#534AB7" />
            </Animated.View>
          )}

          <Text style={styles.verifyingTitle}>
            {stage === 'connecting' && 'Connecting to DigiLocker...'}
            {stage === 'verifying' && 'Verifying your identity...'}
            {stage === 'success' && 'Identity Verified!'}
          </Text>
          <Text style={styles.verifyingSubtext}>
            {stage === 'connecting' && 'Establishing secure connection'}
            {stage === 'verifying' && 'Validating Aadhaar details'}
            {stage === 'success' && 'Your Aadhaar has been verified successfully'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Shield icon */}
        <View style={styles.shieldContainer}>
          <View style={styles.shieldCircle}>
            <Ionicons name="shield-checkmark" size={36} color="#534AB7" />
          </View>
        </View>

        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>
          All Saathi companions must complete Aadhaar verification for the safety of both parties. Your data is encrypted and secure.
        </Text>

        {/* Aadhaar Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Aadhaar Number</Text>
          <TextInput
            style={styles.aadhaarInput}
            placeholder="XXXX XXXX XXXX"
            placeholderTextColor="#A0AEC0"
            keyboardType="number-pad"
            maxLength={14} // 12 digits + 2 spaces
            value={formatAadhaar(aadhaar)}
            onChangeText={(text) => {
              clearError();
              setAadhaar(text.replace(/\s/g, ''));
            }}
          />
          <Text style={styles.inputHint}>Enter your 12-digit Aadhaar number</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#E53E3E" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          title="Verify with DigiLocker"
          onPress={handleVerify}
          disabled={!isValid || loading}
          variant="primary"
          style={{
            backgroundColor: isValid ? '#534AB7' : '#CBD5E0',
            marginTop: 32,
          }}
        />

        {/* Security note */}
        <View style={styles.securityNote}>
          <Ionicons name="lock-closed" size={14} color="#718096" />
          <Text style={styles.securityText}>
            Your Aadhaar data is encrypted end-to-end and never shared with users.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
  },
  shieldContainer: {
    marginBottom: 28,
  },
  shieldCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEEDFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#718096',
    lineHeight: 23,
    marginBottom: 36,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  aadhaarInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 22,
    fontWeight: '700',
    color: '#1A202C',
    letterSpacing: 3,
    textAlign: 'center',
  },
  inputHint: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#E53E3E',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
    paddingVertical: 10,
  },
  securityText: {
    fontSize: 12,
    color: '#718096',
    flex: 1,
  },
  // Verifying states
  verifyingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  verifyingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A202C',
    textAlign: 'center',
  },
  verifyingSubtext: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#38A169',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
