"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUserAuthStore } from "@/store/userAuthStore";
import { getCurrentUser } from "./api";

/** 앱 시작 시 HttpOnly 쿠키 세션을 한 번 복구한다. */
export function UserSessionBootstrap() {
  const pathname = usePathname();
  const sessionChecked = useUserAuthStore((state) => state.sessionChecked);
  const setSession = useUserAuthStore((state) => state.setSession);
  const clearSession = useUserAuthStore((state) => state.clearSession);

  useEffect(() => {
    // 카카오 콜백에서 로그인 쿠키를 발급받기 전에 /auth/me를 조회하면 403이 난다.
    if (sessionChecked || pathname === "/auth/kakao/callback") return;

    let active = true;
    getCurrentUser()
      .then((session) => {
        if (active && !useUserAuthStore.getState().sessionChecked) setSession(session);
      })
      .catch(() => {
        if (active && !useUserAuthStore.getState().sessionChecked) clearSession();
      });
    return () => {
      active = false;
    };
  }, [clearSession, pathname, sessionChecked, setSession]);

  return null;
}
