import { create } from 'zustand';

interface User {
  id: string;
  phone: string;
  points: number;
  tier: string;
  trustScore: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    (globalThis as any).__authToken = token;
    set({ token });
  },
  logout: () => {
    (globalThis as any).__authToken = null;
    set({ user: null, token: null });
  },
  isLoggedIn: () => get().token !== null,
}));