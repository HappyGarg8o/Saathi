import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore } from '../../store/useChatStore';
import { useBookingStore } from '../../store/useBookingStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Input, Avatar, Button } from '@saathi/ui';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const { bookingId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { bookings } = useBookingStore();
  const { messages, fetchMessages, sendMessage, loading, error } = useChatStore();

  const [inputContent, setInputContent] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const booking = bookings.find((b) => b.id === bookingId);
  const chatMessages = messages[bookingId as string] || [];

  // Load chat history
  useEffect(() => {
    if (bookingId) {
      fetchMessages(bookingId as string);
    }
  }, [bookingId]);

  // Auto scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [chatMessages]);

  if (!booking) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#E53E3E" />
        <Text style={styles.errorText}>Booking context not found</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const handleSend = async () => {
    if (!inputContent.trim()) return;
    const contentToSend = inputContent.trim();
    setInputContent('');
    await sendMessage(bookingId as string, contentToSend);
  };

  const formatMsgTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </TouchableOpacity>
        <Avatar uri={booking.companion?.avatar_url} name={booking.companion?.name} size={36} />
        <View style={styles.companionMeta}>
          <Text style={styles.companionName}>{booking.companion?.name}</Text>
          <Text style={styles.companionStatus}>Active Session Chat</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/session/${booking.id}`)}
          style={styles.safetyBtn}
        >
          <Ionicons name="shield-checkmark" size={22} color="#1D9E75" />
        </TouchableOpacity>
      </View>

      {/* Message List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading && chatMessages.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color="#1D9E75" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.messageScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Disclaimer */}
            <View style={styles.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={14} color="#718096" />
              <Text style={styles.disclaimerText}>
                Chats are active only during the booking window. Phone numbers are hidden.
              </Text>
            </View>

            {chatMessages.map((msg) => {
              const isUserSender = msg.sender_id === user?.id;
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isUserSender ? styles.userRow : styles.companionRowMsg,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isUserSender ? styles.userBubble : styles.companionBubble,
                    ]}
                  >
                    <Text style={[styles.msgText, isUserSender ? styles.userMsgText : styles.companionMsgText]}>
                      {msg.content}
                    </Text>
                    <Text style={[styles.msgTime, isUserSender ? styles.userTime : styles.companionTime]}>
                      {formatMsgTime(msg.created_at)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <Input
            placeholder="Type a message..."
            value={inputContent}
            onChangeText={setInputContent}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            containerStyle={styles.textInputContainer}
            style={styles.textInput}
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.8}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  },
  errorText: {
    fontSize: 16,
    color: '#718096',
    marginVertical: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 4,
    marginRight: 10,
  },
  companionMeta: {
    marginLeft: 12,
    flex: 1,
  },
  companionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A202C',
  },
  companionStatus: {
    fontSize: 11,
    color: '#1D9E75',
    fontWeight: '500',
  },
  safetyBtn: {
    padding: 6,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messageScrollContent: {
    padding: 16,
    gap: 12,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF2F7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#4A5568',
    textAlign: 'center',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  companionRowMsg: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#1D9E75',
    borderTopRightRadius: 2,
    maxWidth: '75%',
    flexShrink: 1,
    flexWrap: 'wrap',
    alignSelf: 'flex-end',
  },
  companionBubble: {
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    maxWidth: '75%',
    flexShrink: 1,
    flexWrap: 'wrap',
    alignSelf: 'flex-start',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  userMsgText: {
    color: '#FFFFFF',
  },
  companionMsgText: {
    color: '#2D3748',
  },
  msgTime: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  companionTime: {
    color: '#A0AEC0',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    alignItems: 'center',
  },
  textInputContainer: {
    flex: 1,
    marginBottom: 0, // Override default margin
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1D9E75',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#1D9E75',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
});
