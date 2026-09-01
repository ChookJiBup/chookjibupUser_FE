"use client";

import { useEffect } from "react";
import { useUserAuthStore } from "@/store/userAuthStore";
import { getCurrentUser } from "./api";

/** 앱 시작 시 HttpOnly 쿠키 세션을 한 번 복구한다. */
export function UserSessionBootstrap() {
  const sessionChecked = useUserAuthStore((state) => state.sessionChecked);
  const setSession = useUserAuthStore((state) => state.setSession);
  const clearSession = useUserAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (sessionChecked) return;

    getCurrentUser().then(setSession).catch(clearSession);
  }, [clearSession, sessionChecked, setSession]);

  return null;
}
