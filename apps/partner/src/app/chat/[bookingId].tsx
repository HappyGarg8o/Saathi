import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePartnerBookingStore } from '../../store/usePartnerBookingStore';
import { Ionicons } from '@expo/vector-icons';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'partner' | 'user';
  timestamp: string;
}

const USER_AUTO_REPLIES = [
  "Hey! I'm on my way 😊",
  "Sounds good, see you there!",
  "Can we slightly change the meeting spot?",
  "I'm running about 5 minutes late, sorry!",
  "Looking forward to it!",
  "Got it, thanks for confirming!",
  "That works perfectly for me 👍",
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { activeSession } = usePartnerBookingStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "Hi! I've accepted your booking. Looking forward to meeting you!",
      sender: 'partner',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      text: "Great! Can't wait. See you at the meeting point 😊",
      sender: 'user',
      timestamp: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const replyIndex = useRef(0);

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'partner',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');

    // Simulate user auto-reply after 1.5-3s
    const delay = 1500 + Math.random() * 1500;
    setTimeout(() => {
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: USER_AUTO_REPLIES[replyIndex.current % USER_AUTO_REPLIES.length],
        sender: 'user',
        timestamp: new Date().toISOString(),
      };
      replyIndex.current += 1;
      setMessages((prev) => [...prev, reply]);
    }, delay);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const userName = activeSession?.user_name || 'User';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A202C" />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{userName}</Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isPartner = item.sender === 'partner';
          return (
            <View style={[styles.messageRow, isPartner && styles.messageRowPartner]}>
              <View style={[styles.messageBubble, isPartner ? styles.bubblePartner : styles.bubbleUser]}>
                <Text style={[styles.messageText, isPartner && styles.messageTextPartner]}>
                  {item.text}
                </Text>
                <Text style={[styles.messageTime, isPartner && styles.messageTimePartner]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 12 }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#A0AEC0"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          multiline={false}
        />
        <Pressable
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    gap: 12,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A202C',
  },
  headerStatus: {
    fontSize: 12,
    color: '#38A169',
    fontWeight: '500',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  messageRowPartner: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '78%',
    padding: 12,
    borderRadius: 18,
    gap: 4,
  },
  bubbleUser: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bubblePartner: {
    backgroundColor: '#534AB7',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#1A202C',
    lineHeight: 21,
  },
  messageTextPartner: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#A0AEC0',
    alignSelf: 'flex-end',
  },
  messageTimePartner: {
    color: 'rgba(255,255,255,0.6)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A202C',
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#534AB7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E0',
  },
});
