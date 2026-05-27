"use client";

import { useAuthStore } from "@/src/stores/auth-store";

export function useCurrentUser() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return { user, isAuthenticated };
}
