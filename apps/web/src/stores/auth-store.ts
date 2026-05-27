function getLocalStorage() {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

import { create } from "zustand";

import * as api from "@/src/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  fetchUser: () => Promise<void>;
  initialize: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  _initialized: false,

  initialize: () => {
    const ls = getLocalStorage();
    if (!ls) {
      set({ isLoading: false });
      return;
    }
    const token = ls.getItem("token");
    const refreshToken = ls.getItem("refresh_token");
    const userStr = ls.getItem("user");

    let user: User | null = null;
    try {
      if (userStr) user = JSON.parse(userStr) as User;
    } catch {
      ls?.removeItem("user");
    }

    set({
      token,
      refreshToken,
      user,
      isAuthenticated: !!token,
      isLoading: false,
    });
  },

  login: async (email: string, password: string) => {
    const res = await api.login(email, password);
    const ls = getLocalStorage();
    ls?.setItem("token", res.access_token);
    ls?.setItem("refresh_token", res.refresh_token);
    ls?.setItem("user", JSON.stringify(res.user));

    set({
      token: res.access_token,
      refreshToken: res.refresh_token,
      user: res.user,
      isAuthenticated: true,
    });
  },

  register: async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    const ls = getLocalStorage();
    ls?.setItem("token", res.access_token);
    ls?.setItem("refresh_token", res.refresh_token);
    ls?.setItem("user", JSON.stringify(res.user));

    set({
      token: res.access_token,
      refreshToken: res.refresh_token,
      user: res.user,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    const { token } = get();
    try {
      if (token) {
        await api.logout(token);
      }
    } catch {
      // Ignore errors — clear state regardless
    }

    const ls = getLocalStorage();
    ls?.removeItem("token");
    ls?.removeItem("refresh_token");
    ls?.removeItem("user");

    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  refreshTokens: async () => {
    const { refreshToken: storedRefresh } = get();
    if (!storedRefresh) return;

    try {
      const res = await api.refreshToken(storedRefresh);
      const ls = getLocalStorage();
      ls?.setItem("token", res.access_token);
      ls?.setItem("refresh_token", res.refresh_token);

      set({
        token: res.access_token,
        refreshToken: res.refresh_token,
      });
    } catch {
      get().logout();
    }
  },

  fetchUser: async () => {
    const { token } = get();
    if (!token) return;

    try {
      const user = await api.getMe(token);
      const ls = getLocalStorage();
      ls?.setItem("user", JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch {
      get().logout();
    }
  },

  setUser: (user: User) => {
    const ls = getLocalStorage();
    ls?.setItem("user", JSON.stringify(user));
    set({ user });
  },
}));

// Lazy init: only run in browser, not during SSR
if (typeof window !== "undefined") {
  useAuthStore.getState().initialize();
}
