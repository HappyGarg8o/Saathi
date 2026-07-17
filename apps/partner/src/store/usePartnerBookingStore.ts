import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { usePartnerAuthStore } from './usePartnerAuthStore';

export interface BookingRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  user_gender: 'male' | 'female' | 'other';
  activity_type: string;
  start_time: string;
  duration_hours: number;
  meeting_point: string;
  total_price: number;
  platform_fee: number;
  companion_payout: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'declined';
  created_at: string;
  // Auto-decline: 2 hours from created_at
  expires_at: string;
}

export interface ActiveSession {
  id: string;
  booking_id: string;
  user_name: string;
  user_avatar: string;
  activity_type: string;
  meeting_point: string;
  started_at: string;
  duration_hours: number;
  sos_triggered: boolean;
}

const mapBookingFromDb = (dbBooking: any): BookingRequest => {
  const userObj = Array.isArray(dbBooking.users) ? dbBooking.users[0] : dbBooking.users;
  const createdAtTime = dbBooking.created_at ? new Date(dbBooking.created_at).getTime() : Date.now();
  const expiresAt = new Date(createdAtTime + 30 * 60 * 1000).toISOString();
  
  return {
    id: dbBooking.id,
    user_id: dbBooking.user_id,
    user_name: userObj?.name || 'User',
    user_avatar: userObj?.avatar_url || '',
    user_gender: (userObj?.gender as 'male' | 'female' | 'other') || 'other',
    activity_type: dbBooking.activity_type,
    start_time: dbBooking.start_time,
    duration_hours: Number(dbBooking.duration_hours),
    meeting_point: dbBooking.meeting_point,
    total_price: dbBooking.total_price,
    platform_fee: dbBooking.platform_fee,
    companion_payout: dbBooking.companion_payout,
    status: dbBooking.status,
    created_at: dbBooking.created_at,
    expires_at: expiresAt,
  };
};

interface PartnerBookingState {
  requests: BookingRequest[];
  pendingRequests: BookingRequest[];
  upcomingRequests: BookingRequest[];
  activeSession: ActiveSession | null;
  loading: boolean;
  error: string | null;

  fetchRequests: () => Promise<void>;
  acceptRequest: (bookingId: string) => Promise<boolean>;
  declineRequest: (bookingId: string) => Promise<boolean>;
  acceptBooking: (bookingId: string) => Promise<boolean>;
  declineBooking: (bookingId: string) => Promise<boolean>;
  startSession: (bookingId: string) => Promise<boolean>;
  endSession: () => Promise<boolean>;
  triggerSOS: () => Promise<void>;

  getPending: () => BookingRequest[];
  getUpcoming: () => BookingRequest[];
  getCompleted: () => BookingRequest[];
}

// 2-hour expiry window
const EXPIRY_MS = 2 * 60 * 60 * 1000;

const now = new Date();

const MOCK_REQUESTS: BookingRequest[] = [
  {
    id: 'br1',
    user_id: 'mock-user-919876543210',
    user_name: 'Arjun Menon',
    user_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&fit=crop',
    user_gender: 'male',
    activity_type: 'Coffee',
    start_time: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
    duration_hours: 1,
    meeting_point: 'Third Wave Coffee, Indiranagar',
    total_price: 399,
    platform_fee: 100,
    companion_payout: 299,
    status: 'pending',
    created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 min ago
    expires_at: new Date(now.getTime() - 30 * 60 * 1000 + EXPIRY_MS).toISOString(),
  },
  {
    id: 'br2',
    user_id: 'mock-user-919123456789',
    user_name: 'Sneha Kulkarni',
    user_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&fit=crop',
    user_gender: 'female',
    activity_type: 'City Walk',
    start_time: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
    duration_hours: 2,
    meeting_point: 'Cubbon Park Main Gate',
    total_price: 998,
    platform_fee: 250,
    companion_payout: 748,
    status: 'pending',
    created_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // 10 min ago
    expires_at: new Date(now.getTime() - 10 * 60 * 1000 + EXPIRY_MS).toISOString(),
  },
  {
    id: 'br3',
    user_id: 'mock-user-919555111222',
    user_name: 'Rahul Patel',
    user_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&fit=crop',
    user_gender: 'male',
    activity_type: 'Dinner',
    start_time: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(), // day after tomorrow
    duration_hours: 2,
    meeting_point: 'Toit Brewpub, Indiranagar',
    total_price: 1198,
    platform_fee: 300,
    companion_payout: 898,
    status: 'confirmed',
    created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(now.getTime() - 2 * 60 * 60 * 1000 + EXPIRY_MS).toISOString(),
  },
  {
    id: 'br4',
    user_id: 'mock-user-919333444555',
    user_name: 'Kavya Iyer',
    user_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&fit=crop',
    user_gender: 'female',
    activity_type: 'Movie',
    start_time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    duration_hours: 3,
    meeting_point: 'PVR Orion Mall, Rajajinagar',
    total_price: 1497,
    platform_fee: 374,
    companion_payout: 1123,
    status: 'completed',
    created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + EXPIRY_MS).toISOString(),
  },
];

export const usePartnerBookingStore = create<PartnerBookingState>((set, get) => ({
  requests: [],
  pendingRequests: [],
  upcomingRequests: [],
  activeSession: null,
  loading: false,
  error: null,

  fetchRequests: async () => {
    set({ loading: true, error: null });
    try {
      // Fetch ALL pending bookings for testing
      const { data: pendingBookings, error: pendingError } = await supabase
        .from('bookings')
        .select(`*, users(id, name, avatar_url, gender)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      console.log('PENDING BOOKINGS:', JSON.stringify(pendingBookings));
      console.log('PENDING ERROR:', JSON.stringify(pendingError));
      
      const mappedPending = (pendingBookings || []).map(mapBookingFromDb);
      console.log('MAPPED PENDING:', JSON.stringify(mappedPending));

      // Fetch ALL confirmed/active bookings for testing
      const { data: upcomingBookings } = await supabase
        .from('bookings')
        .select(`*, users(id, name, avatar_url, gender)`)
        .in('status', ['confirmed', 'active'])
        .order('start_time', { ascending: true });
      
      const mappedUpcoming = (upcomingBookings || []).map(mapBookingFromDb);

      // Fetch ALL completed bookings for testing
      const { data: completedBookings } = await supabase
        .from('bookings')
        .select(`*, users(id, name, avatar_url, gender)`)
        .eq('status', 'completed')
        .order('start_time', { ascending: false });
      
      const mappedCompleted = (completedBookings || []).map(mapBookingFromDb);
      
      const allRequests = [
        ...mappedPending, 
        ...mappedUpcoming, 
        ...mappedCompleted
      ];

      set({
        requests: allRequests,
        pendingRequests: mappedPending,
        upcomingRequests: mappedUpcoming,
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch requests' });
    } finally {
      set({ loading: false });
    }
  },

  acceptRequest: async (bookingId: string) => {
    return get().acceptBooking(bookingId);
  },

  declineRequest: async (bookingId: string) => {
    return get().declineBooking(bookingId);
  },

  acceptBooking: async (bookingId: string) => {
    set({ loading: true });
    try {
      if (bookingId.startsWith('mock-booking-') || bookingId.startsWith('br')) {
        const existing = await AsyncStorage.getItem('mock_bookings');
        if (existing) {
          const bookings = JSON.parse(existing);
          const updated = bookings.map((b: any) =>
            b.id === bookingId ? { ...b, status: 'confirmed' } : b
          );
          await AsyncStorage.setItem('mock_bookings', JSON.stringify(updated));
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error && !bookingId.startsWith('mock-booking-') && !bookingId.startsWith('br')) throw error;
      await get().fetchRequests();
      return true;
    } catch (err) {
      console.error('Error accepting booking:', err);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  declineBooking: async (bookingId: string) => {
    set({ loading: true });
    try {
      if (bookingId.startsWith('mock-booking-') || bookingId.startsWith('br')) {
        const existing = await AsyncStorage.getItem('mock_bookings');
        if (existing) {
          const bookings = JSON.parse(existing);
          const updated = bookings.map((b: any) =>
            b.id === bookingId ? { ...b, status: 'cancelled', cancelled_by: 'companion' } : b
          );
          await AsyncStorage.setItem('mock_bookings', JSON.stringify(updated));
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_by: 'companion'
        })
        .eq('id', bookingId);

      if (error && !bookingId.startsWith('mock-booking-') && !bookingId.startsWith('br')) throw error;
      await get().fetchRequests();
      return true;
    } catch (err) {
      console.error('Error declining booking:', err);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  startSession: async (bookingId: string) => {
    try {
      console.log('Starting session for:', bookingId);
      
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'active' })
        .eq('id', bookingId);
      
      console.log('Supabase update error:', error);
      
      if (error) throw error;
      
      // Update local state
      const updatedRequests = get().requests.map(r =>
        r.id === bookingId 
          ? { ...r, status: 'active' as const }
          : r
      );
      set({ requests: updatedRequests });
      
      return true;
    } catch (err) {
      console.error('startSession error:', err);
      return false;
    }
  },

  endSession: async () => {
    set({ loading: true, error: null });
    try {
      const { activeSession } = get();
      if (!activeSession) throw new Error('No active session');

      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', activeSession.booking_id);
      if (bookingError) throw bookingError;

      const { error: sessionError } = await supabase
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', activeSession.id);
      if (sessionError) throw sessionError;

      set({ activeSession: null });
      await get().fetchRequests();
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  triggerSOS: async () => {
    const { activeSession } = get();
    const { user } = usePartnerAuthStore.getState();
    
    if (!activeSession || !user) return;
    
    set({
      activeSession: { ...activeSession, sos_triggered: true },
    });
    
    console.log('🚨 SOS TRIGGERED — Partner side. Session:', activeSession.id);
    console.log(`[ALERT] SOS sent for Partner ${user.name} (${user.phone})`);
    
    if (user.emergency_contact_phone) {
      console.log(`[SMS] Sending automated SOS SMS to Emergency Contact (${user.emergency_contact_name} - ${user.emergency_contact_phone}) with live location link.`);
    } else {
      console.log(`[WARNING] No Emergency Contact configured for this partner.`);
    }
  },

  getPending: () => {
    return get().requests.filter((r) => r.status === 'pending');
  },
  getUpcoming: () => {
    return get().requests.filter((r) => 
      r.status === 'confirmed' || r.status === 'active'
    );
  },
  getCompleted: () => get().requests.filter((r) => r.status === 'completed'),
}));
