import { create } from 'zustand';
import type { TripPlan, TripRequest } from '../types/trip';

interface TripStore {
  request: TripRequest | null;
  plan: TripPlan | null;
  activeEventId: string | null;
  setRequest: (req: TripRequest) => void;
  setPlan: (plan: TripPlan) => void;
  setActiveEvent: (id: string | null) => void;
  reset: () => void;
}

export const useTripStore = create<TripStore>((set) => ({
  request: null,
  plan: null,
  activeEventId: null,
  setRequest: (req) => set({ request: req }),
  setPlan: (plan) => set({ plan }),
  setActiveEvent: (id) => set({ activeEventId: id }),
  reset: () => set({ request: null, plan: null, activeEventId: null }),
}));
