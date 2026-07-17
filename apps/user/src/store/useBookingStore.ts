import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './useAuthStore';
import { useCompanionStore } from './useCompanionStore';

export interface Booking {
  id: string;
  user_id: string;
  companion_id: string;
  activity_type: 'Coffee' | 'Dinner' | 'Movie' | 'City Walk' | 'Event Plus-One' | 'Custom';
  start_time: string; // ISO string
  duration_hours: number;
  meeting_point: string;
  total_price: number;
  platform_fee: number;
  companion_payout: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  companion?: {
    name: string;
    avatar_url: string | null;
  };
}

export interface Session {
  id: string;
  booking_id: string;
  started_at: string | null;
  ended_at: string | null;
  sos_triggered: boolean;
}

interface BookingState {
  bookings: Booking[];
  activeSession: Session | null;
  loading: boolean;
  error: string | null;
  
  fetchBookings: () => Promise<void>;
  createBooking: (
    companionId: string,
    activityType: Booking['activity_type'],
    startTime: string,
    durationHours: number,
    meetingPoint: string,
    hourlyRate: number,
    companionName: string,
    companionAvatarUrl: string | null,
    paymentId?: string
  ) => Promise<any>;
  confirmBookingPayment: (bookingId: string) => Promise<boolean>;
  startSession: (bookingId: string) => Promise<boolean>;
  endSession: (bookingId: string) => Promise<boolean>;
  triggerSos: (bookingId: string, location: { latitude: number; longitude: number }) => Promise<boolean>;
  submitReview: (bookingId: string, stars: number, text: string) => Promise<boolean>;
  cancelBooking: (bookingId: string) => Promise<{ success: boolean; refundAmount?: number }>;
}

const BOOKINGS_STORAGE_KEY = 'saathi_mock_bookings';

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  activeSession: null,
  loading: false,
  error: null,

  fetchBookings: async () => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth, user } = useAuthStore.getState();
      if (!user) return;

      if (useMockAuth) {
        // Load bookings from Local Storage
        const savedBookings = await AsyncStorage.getItem('mock_bookings');
        if (savedBookings) {
          const parsedBookings: Booking[] = JSON.parse(savedBookings);
          
          // Populate companion info for each mock booking if missing
          const { companions } = useCompanionStore.getState();
          const parsedWithCompanion = parsedBookings.map(b => {
            if (!b.companion) {
              const compInfo = companions.find(c => c.id === b.companion_id);
              return {
                ...b,
                companion: {
                  name: compInfo?.name || 'Anonymous Companion',
                  avatar_url: compInfo?.avatar_url || null,
                }
              };
            }
            return b;
          });

          // MVP Auto-close logic for MockAuth
          const nowMs = Date.now();
          const updatedBookings = parsedWithCompanion.map(b => {
            if (b.status === 'active') {
              const startMs = new Date(b.created_at).getTime();
              const durationMs = b.duration_hours * 60 * 60 * 1000;
              // If expired for more than 1 hour, auto close
              if (nowMs > startMs + durationMs + (60 * 60 * 1000)) {
                return { ...b, status: 'completed' as const };
              }
            }
            return b;
          });

          // Save back if changed
          if (JSON.stringify(parsedBookings) !== JSON.stringify(updatedBookings)) {
            await AsyncStorage.setItem('mock_bookings', JSON.stringify(updatedBookings));
          }

          set({ bookings: updatedBookings });
          
          // Re-evaluate activeSession
          if (get().activeSession) {
            const activeB = updatedBookings.find(b => b.id === get().activeSession?.booking_id);
            if (activeB?.status === 'completed') {
              set({ activeSession: null });
            }
          }
        }
      } else {
        // Query Supabase for bookings joined with companions
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            companions (
              users (
                name,
                avatar_url
              )
            )
          `)
          .eq('user_id', user.id)
          .order('start_time', { ascending: false });

        if (error) throw error;

        if (data) {
          const formatted: Booking[] = data.map((b: any) => ({
            id: b.id,
            user_id: b.user_id,
            companion_id: b.companion_id,
            activity_type: b.activity_type,
            start_time: b.start_time,
            duration_hours: parseFloat(b.duration_hours),
            meeting_point: b.meeting_point,
            total_price: b.total_price,
            platform_fee: b.platform_fee,
            companion_payout: b.companion_payout,
            status: b.status,
            created_at: b.created_at,
            companion: {
              name: b.companions?.users?.name || 'Anonymous Companion',
              avatar_url: b.companions?.users?.avatar_url || null,
            },
          }));
          // MVP Auto-close logic for Supabase
          const nowMs = Date.now();
          let needsStateUpdate = false;
          
          for (const b of formatted) {
            if (b.status === 'active') {
              const startMs = new Date(b.created_at).getTime();
              const durationMs = b.duration_hours * 60 * 60 * 1000;
              if (nowMs > startMs + durationMs + (60 * 60 * 1000)) {
                // Auto close in DB
                await supabase.from('bookings').update({ status: 'completed' }).eq('id', b.id);
                await supabase.from('sessions').update({ ended_at: new Date().toISOString() }).eq('booking_id', b.id);
                b.status = 'completed';
                needsStateUpdate = true;
              }
            }
          }

          set({ bookings: formatted });

          if (needsStateUpdate && get().activeSession) {
            const activeB = formatted.find(b => b.id === get().activeSession?.booking_id);
            if (activeB?.status === 'completed') {
              set({ activeSession: null });
            }
          }
        }
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to load bookings' });
    } finally {
      set({ loading: false });
    }
  },

  createBooking: async (
    companionId,
    activityType,
    startTime,
    durationHours,
    meetingPoint,
    hourlyRate,
    companionName,
    companionAvatarUrl,
    paymentId
  ) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth, user } = useAuthStore.getState();
      if (!user) throw new Error('No active user logged in');

      // Price Calculations (₹299/hr entry price, or companion custom rate)
      const totalPrice = Math.round(hourlyRate * durationHours);
      const platformFee = Math.round(totalPrice * 0.25); // 25% commission
      const companionPayout = totalPrice - platformFee;

      const newBookingId = `b-${Math.random().toString(36).substring(2, 11)}`;
      const newBooking: Booking = {
        id: newBookingId,
        user_id: user.id,
        companion_id: companionId,
        activity_type: activityType,
        start_time: startTime,
        duration_hours: durationHours,
        meeting_point: meetingPoint,
        total_price: totalPrice,
        platform_fee: platformFee,
        companion_payout: companionPayout,
        status: 'pending',
        created_at: new Date().toISOString(),
        companion: {
          name: companionName,
          avatar_url: companionAvatarUrl,
        },
      };

      if (useMockAuth) {
        // Generate a mock booking ID
        const mockBookingId = `mock-booking-${Date.now()}`;
        
        // Store mock booking in AsyncStorage
        const mockBooking = {
          id: mockBookingId,
          companion_id: companionId,
          companion: {
            name: companionName,
            avatar_url: companionAvatarUrl,
          },
          activity_type: activityType,
          start_time: startTime,
          duration_hours: durationHours,
          meeting_point: meetingPoint,
          total_price: totalPrice,
          platform_fee: platformFee,
          companion_payout: companionPayout,
          status: 'confirmed',
          created_at: new Date().toISOString(),
          payment_id: paymentId || null,
        };
        
        const existing = await AsyncStorage.getItem('mock_bookings');
        const bookings = existing ? JSON.parse(existing) : [];
        bookings.push(mockBooking);
        await AsyncStorage.setItem('mock_bookings', JSON.stringify(bookings));

        const stateBooking: Booking = {
          ...mockBooking,
          user_id: user.id,
          status: 'confirmed' as const,
          companion: {
            name: companionName,
            avatar_url: companionAvatarUrl,
          }
        };
        set({ bookings: [stateBooking, ...get().bookings] });
        
        return { success: true, bookingId: mockBookingId };
      } else {
        // Create in Supabase Database
        const { data, error } = await supabase
          .from('bookings')
          .insert({
            user_id: user.id,
            companion_id: companionId,
            activity_type: activityType,
            start_time: startTime,
            duration_hours: durationHours,
            meeting_point: meetingPoint,
            total_price: totalPrice,
            platform_fee: platformFee,
            companion_payout: companionPayout,
            status: 'confirmed',
            payment_id: paymentId || null,
          })
          .select()
          .single();

        if (error) throw error;
        
        const bookingWithDetails: Booking = {
          ...data,
          companion: {
            name: companionName,
            avatar_url: companionAvatarUrl,
          },
        };

        set({ bookings: [bookingWithDetails, ...get().bookings] });
        return bookingWithDetails;
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to create booking' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  confirmBookingPayment: async (bookingId) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth } = useAuthStore.getState();

      if (useMockAuth) {
        const updatedList = get().bookings.map((b) => {
          if (b.id === bookingId) {
            return { ...b, status: 'confirmed' as const };
          }
          return b;
        });
        await AsyncStorage.setItem('mock_bookings', JSON.stringify(updatedList));
        set({ bookings: updatedList });
        return true;
      } else {
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', bookingId);

        if (error) throw error;
        
        set({
          bookings: get().bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'confirmed' as const } : b
          ),
        });
        return true;
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to confirm payment' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  startSession: async (bookingId) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth } = useAuthStore.getState();
      const startedAt = new Date().toISOString();

      if (useMockAuth) {
        // Mock Session creation
        const mockSession: Session = {
          id: `sess-${Math.random().toString(36).substring(2, 11)}`,
          booking_id: bookingId,
          started_at: startedAt,
          ended_at: null,
          sos_triggered: false,
        };

        const updatedList = get().bookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'active' as const } : b
        );
        await AsyncStorage.setItem('mock_bookings', JSON.stringify(updatedList));
        
        set({
          bookings: updatedList,
          activeSession: mockSession,
        });
        return true;
      } else {
        // 1. Update Booking status to 'active'
        const { error: bookingErr } = await supabase
          .from('bookings')
          .update({ status: 'active' })
          .eq('id', bookingId);
        
        if (bookingErr) throw bookingErr;

        // 2. Insert Session record
        const { data: sessionData, error: sessionErr } = await supabase
          .from('sessions')
          .insert({
            booking_id: bookingId,
            started_at: startedAt,
            sos_triggered: false,
          })
          .select()
          .single();

        if (sessionErr) throw sessionErr;

        set({
          bookings: get().bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'active' as const } : b
          ),
          activeSession: sessionData as Session,
        });
        return true;
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to start session' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  endSession: async (bookingId) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth } = useAuthStore.getState();
      const endedAt = new Date().toISOString();

      if (useMockAuth) {
        const updatedList = get().bookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'completed' as const } : b
        );
        await AsyncStorage.setItem('mock_bookings', JSON.stringify(updatedList));
        
        set({
          bookings: updatedList,
          activeSession: null,
        });
        return true;
      } else {
        // 1. Update Booking status to 'completed'
        const { error: bookingErr } = await supabase
          .from('bookings')
          .update({ status: 'completed' })
          .eq('id', bookingId);

        if (bookingErr) throw bookingErr;

        // 2. Update Session record
        if (get().activeSession) {
          const { error: sessionErr } = await supabase
            .from('sessions')
            .update({ ended_at: endedAt })
            .eq('booking_id', bookingId);

          if (sessionErr) throw sessionErr;
        }

        set({
          bookings: get().bookings.map((b) =>
            b.id === bookingId ? { ...b, status: 'completed' as const } : b
          ),
          activeSession: null,
        });
        return true;
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to end session' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  triggerSos: async (bookingId, location) => {
    set({ error: null });
    try {
      const { useMockAuth, user } = useAuthStore.getState();
      const { bookings } = get();
      const activeBooking = bookings.find((b) => b.id === bookingId);
      if (!user || !activeBooking) return false;

      // Operations Alert details (Mock operations email send)
      console.log(`[ALERT] SOS TRIGGERED BY USER ${user.name} (${user.phone})!`);
      console.log(`GPS Coordinates: Latitude ${location.latitude}, Longitude ${location.longitude}`);
      console.log(`Companion booked: ${activeBooking.companion?.name || 'ID: ' + activeBooking.companion_id}`);
      console.log(`OPS Notification sent to ops@saathi.in`);

      if (user.emergency_contact_phone) {
        console.log(`[SMS] Sending automated SOS SMS to Emergency Contact (${user.emergency_contact_name} - ${user.emergency_contact_phone}) with live location link.`);
      } else {
        console.log(`[WARNING] No Emergency Contact configured for this user.`);
      }

      if (useMockAuth) {
        if (get().activeSession) {
          set({
            activeSession: {
              ...get().activeSession!,
              sos_triggered: true,
            },
          });
        }
        return true;
      } else {
        const { error } = await supabase
          .from('sessions')
          .update({ sos_triggered: true })
          .eq('booking_id', bookingId);

        if (error) throw error;

        if (get().activeSession) {
          set({
            activeSession: {
              ...get().activeSession!,
              sos_triggered: true,
            },
          });
        }
        return true;
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to trigger SOS' });
      return false;
    }
  },

  submitReview: async (bookingId, stars, text) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth, user } = useAuthStore.getState();
      const booking = get().bookings.find((b) => b.id === bookingId);
      if (!user || !booking) throw new Error('Booking or user context not found');

      if (useMockAuth) {
        // Mock review submission success
        await new Promise((resolve) => setTimeout(resolve, 800));
        return true;
      } else {
        // Insert review
        const { error } = await supabase
          .from('reviews')
          .insert({
            booking_id: bookingId,
            reviewer_id: user.id,
            reviewee_id: booking.companion_id, // The companion user_id or companion_id?
            // Note: Schema reviewer_id/reviewee_id references public.users.
            // We reference the user profile of the companion or reviewee.
            stars,
            text,
          });

        if (error) throw error;
        return true;
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to submit review' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  cancelBooking: async (bookingId: string) => {
    set({ loading: true, error: null });
    try {
      const { useMockAuth } = useAuthStore.getState();
      const booking = get().bookings.find(b => b.id === bookingId);
      if (!booking) return { success: false };

      const hoursUntilSession = (new Date(booking.start_time).getTime() - Date.now()) / 3600000;

      let refundAmount = 0;
      if (hoursUntilSession >= 3) {
        refundAmount = booking.total_price;
      } else if (hoursUntilSession > 0) {
        refundAmount = Math.round(booking.total_price * 0.5);
      }

      if (useMockAuth) {
        const updatedBookings = get().bookings.map(b =>
          b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
        );
        await AsyncStorage.setItem('mock_bookings', JSON.stringify(updatedBookings));
        set({ bookings: updatedBookings });
        return { success: true, refundAmount };
      } else {
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', bookingId);
        if (error) throw error;

        const updatedBookings = get().bookings.map(b =>
          b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
        );
        set({ bookings: updatedBookings });
        return { success: true, refundAmount };
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to cancel booking' });
      return { success: false };
    } finally {
      set({ loading: false });
    }
  },
}));
