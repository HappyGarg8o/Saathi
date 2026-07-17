import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ChatState {
  messages: { [bookingId: string]: Message[] };
  loading: boolean;
  error: string | null;
  
  fetchMessages: (bookingId: string) => Promise<void>;
  sendMessage: (bookingId: string, content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  loading: false,
  error: null,

  fetchMessages: async (bookingId) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth } = useAuthStore.getState();

      if (useMockAuth) {
        // Return existing messages or empty array
        const currentMsgs = get().messages[bookingId] || [];
        set((state) => ({
          messages: { ...state.messages, [bookingId]: currentMsgs },
        }));
      } else {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('booking_id', bookingId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        set((state) => ({
          messages: { ...state.messages, [bookingId]: data || [] },
        }));
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch messages' });
    } finally {
      set({ loading: false });
    }
  },

  sendMessage: async (bookingId, content) => {
    try {
      const { useMockAuth, user } = useAuthStore.getState();
      if (!user) throw new Error('No user authenticated');

      const userMsg: Message = {
        id: `m-${Math.random().toString(36).substring(2, 11)}`,
        booking_id: bookingId,
        sender_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString(),
      };

      // Append user message immediately to the state
      set((state) => {
        const current = state.messages[bookingId] || [];
        return {
          messages: { ...state.messages, [bookingId]: [...current, userMsg] },
        };
      });

      if (useMockAuth) {
        // Run companion automated replies simulator after 1.5 seconds
        setTimeout(() => {
          const companionId = 'u_comp_simulated';
          const lowerContent = content.toLowerCase();
          
          let replyText = "Sounds good! Looking forward to meeting you at our scheduled time.";
          
          if (lowerContent.includes('where') || lowerContent.includes('reach') || lowerContent.includes('location')) {
            replyText = "Hey! I am just reaching the meeting point now. I'm wearing a blue shirt. See you in a minute!";
          } else if (lowerContent.includes('hi') || lowerContent.includes('hello') || lowerContent.includes('hey')) {
            replyText = "Hey there! Really excited for our session today. Let me know when you arrive.";
          } else if (lowerContent.includes('late') || lowerContent.includes('delay')) {
            replyText = "No worries at all! Safety first. Take your time, I am waiting at the location.";
          }

          const companionMsg: Message = {
            id: `m-${Math.random().toString(36).substring(2, 11)}`,
            booking_id: bookingId,
            sender_id: companionId,
            content: replyText,
            created_at: new Date().toISOString(),
          };

          set((state) => {
            const current = state.messages[bookingId] || [];
            return {
              messages: { ...state.messages, [bookingId]: [...current, companionMsg] },
            };
          });
        }, 1500);

      } else {
        // Send to Supabase
        const { error } = await supabase
          .from('messages')
          .insert({
            booking_id: bookingId,
            sender_id: user.id,
            content: content.trim(),
          });

        if (error) throw error;
        // Supabase Realtime subscription in the screen will update the store list,
        // but for safety we can refetch or rely on sync.
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to send message' });
    }
  },
}));
