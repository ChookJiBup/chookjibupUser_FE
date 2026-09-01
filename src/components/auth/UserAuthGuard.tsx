"use client";

import type { ReactNode } from "react";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";

interface UserAuthGuardProps {
  children: ReactNode;
  fallback: ReactNode;
  loadingFallback?: ReactNode;
}

/** HttpOnly 쿠키 세션 확인이 끝난 뒤 로그인 여부에 맞는 화면을 표시한다. */
export function UserAuthGuard({ children, fallback, loadingFallback = null }: UserAuthGuardProps) {
  const sessionChecked = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);

  if (!sessionChecked) return loadingFallback;
  if (!session) return fallback;

  return children;
}
