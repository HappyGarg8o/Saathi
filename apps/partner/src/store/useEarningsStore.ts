import { create } from 'zustand';

export interface PayoutRecord {
  id: string;
  amount: number;
  upiId: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface SessionEarning {
  id: string;
  booking_id: string;
  user_name: string;
  activity_type: string;
  duration_hours: number;
  total_price: number;
  companion_payout: number;
  completed_at: string;
}

interface EarningsState {
  totalEarned: number;
  availableBalance: number;
  pendingPayout: number;
  payoutHistory: PayoutRecord[];
  sessionEarnings: SessionEarning[];
  weeklyEarnings: number[]; // Last 4 weeks
  loading: boolean;
  error: string | null;

  fetchEarnings: () => Promise<void>;
  requestPayout: (amount: number, upiId: string) => Promise<boolean>;
}

const MOCK_SESSION_EARNINGS: SessionEarning[] = [
  {
    id: 'se1',
    booking_id: 'br4',
    user_name: 'Kavya Iyer',
    activity_type: 'Movie',
    duration_hours: 3,
    total_price: 1497,
    companion_payout: 1123,
    completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'se2',
    booking_id: 'br_old1',
    user_name: 'Vikram Singh',
    activity_type: 'Coffee',
    duration_hours: 1,
    total_price: 499,
    companion_payout: 374,
    completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'se3',
    booking_id: 'br_old2',
    user_name: 'Anita Desai',
    activity_type: 'City Walk',
    duration_hours: 2,
    total_price: 998,
    companion_payout: 748,
    completed_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'se4',
    booking_id: 'br_old3',
    user_name: 'Deepak Rao',
    activity_type: 'Dinner',
    duration_hours: 2,
    total_price: 1198,
    companion_payout: 898,
    completed_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'se5',
    booking_id: 'br_old4',
    user_name: 'Priya Nair',
    activity_type: 'Event Plus-One',
    duration_hours: 3,
    total_price: 1797,
    companion_payout: 1348,
    completed_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_PAYOUTS: PayoutRecord[] = [
  {
    id: 'po1',
    amount: 2000,
    upiId: 'partner@upi',
    status: 'completed',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const useEarningsStore = create<EarningsState>((set, get) => ({
  totalEarned: 0,
  availableBalance: 0,
  pendingPayout: 0,
  payoutHistory: [],
  sessionEarnings: [],
  weeklyEarnings: [1348, 1646, 1497, 374], // Mock last 4 weeks (newest first)
  loading: false,
  error: null,

  fetchEarnings: async () => {
    set({ loading: true, error: null });
    try {
      await new Promise((r) => setTimeout(r, 500));

      const totalEarned = MOCK_SESSION_EARNINGS.reduce((sum, s) => sum + s.companion_payout, 0);
      const totalPaidOut = MOCK_PAYOUTS
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      set({
        sessionEarnings: MOCK_SESSION_EARNINGS,
        payoutHistory: MOCK_PAYOUTS,
        totalEarned,
        availableBalance: totalEarned - totalPaidOut,
        pendingPayout: 0,
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load earnings' });
    } finally {
      set({ loading: false });
    }
  },

  requestPayout: async (amount: number, upiId: string) => {
    set({ loading: true, error: null });
    try {
      const { availableBalance } = get();
      if (amount > availableBalance) {
        throw new Error('Insufficient balance');
      }
      if (amount < 100) {
        throw new Error('Minimum payout is ₹100');
      }

      // Simulate 2s UPI processing
      set({ pendingPayout: amount });
      await new Promise((r) => setTimeout(r, 2000));

      const payout: PayoutRecord = {
        id: `po-${Date.now()}`,
        amount,
        upiId,
        status: 'completed',
        created_at: new Date().toISOString(),
      };

      set((state) => ({
        payoutHistory: [payout, ...state.payoutHistory],
        availableBalance: state.availableBalance - amount,
        pendingPayout: 0,
      }));

      return true;
    } catch (err: any) {
      set({ error: err.message || 'Payout failed', pendingPayout: 0 });
      return false;
    } finally {
      set({ loading: false });
    }
  },
}));
