"use client";

import { useEffect, useRef } from "react";

import { useAuthStore } from "@/src/stores/auth-store";

export function useAuth() {
  const store = useAuthStore((s) => ({
    user: s.user,
    isAuthenticated: s.isAuthenticated,
    isLoading: s.isLoading,
    login: s.login,
    register: s.register,
    logout: s.logout,
    refreshTokens: s.refreshTokens,
  }));

  const token = useAuthStore((s) => s.token);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const initialized = useRef(false);

  useEffect(() => {
    if (token && !initialized.current) {
      initialized.current = true;
      fetchUser();
    }
  }, [token, fetchUser]);

  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      useAuthStore.getState().refreshTokens();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [token]);

  return store;
}
