"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "OWNER" | "CLEANER" | "INTERNAL_OPS" | "ADMIN";
export type SubscriptionStatus = "FREE" | "ACTIVE" | "PAST_DUE" | "CANCELLED";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  subscriptionStatus: SubscriptionStatus;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (role: UserRole) => boolean;
  isSubscribed: () => boolean;
  updateSubscriptionStatus: (status: SubscriptionStatus) => void;
}

const TOKEN_KEY = "hostiq_token";
const USER_KEY = "hostiq_user";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      login: (token: string, user: AuthUser) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        }
        set({ token, user });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
        set({ token: null, user: null });
      },

      isAuthenticated: () => {
        const { token } = get();
        return !!token;
      },

      hasRole: (role: UserRole) => {
        const { user } = get();
        if (!user) return false;
        if (role === "ADMIN" || role === "INTERNAL_OPS") {
          return user.role === "ADMIN" || user.role === "INTERNAL_OPS";
        }
        return user.role === role;
      },

      isSubscribed: () => {
        const { user } = get();
        return user?.subscriptionStatus === "ACTIVE";
      },

      updateSubscriptionStatus: (status: SubscriptionStatus) => {
        set((state) => ({
          user: state.user ? { ...state.user, subscriptionStatus: status } : null,
        }));
      },
    }),
    {
      name: "hostiq-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token && typeof window !== "undefined") {
          localStorage.setItem(TOKEN_KEY, state.token);
        }
      },
    }
  )
);
