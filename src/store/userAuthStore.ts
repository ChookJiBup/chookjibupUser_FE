import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserSession {
  accessToken: string;
  /** 토큰 만료 시각 (epoch ms) */
  expiresAt: number;
  nickname: string;
  email: string | null;
  profileImageUrl: string | null;
}

interface UserAuthState {
  session: UserSession | null;
  setSession: (
    accessToken: string,
    expiresInSeconds: number,
    nickname: string,
    email: string | null,
    profileImageUrl: string | null,
  ) => void;
  clearSession: () => void;
  isSessionValid: () => boolean;
}

export const useUserAuthStore = create<UserAuthState>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (accessToken, expiresInSeconds, nickname, email, profileImageUrl) =>
        set({
          session: {
            accessToken,
            expiresAt: Date.now() + expiresInSeconds * 1000,
            nickname,
            email,
            profileImageUrl,
          },
        }),
      clearSession: () => set({ session: null }),
      isSessionValid: () => {
        const { session } = get();
        return session !== null && session.expiresAt > Date.now();
      },
    }),
    { name: "chookjibup-user-auth" },
  ),
);

/**
 * localStorage에서 세션을 복원하는 zustand persist rehydration이 끝났는지 추적한다.
 * 이게 끝나기 전에 isSessionValid를 판단하면 로그인된 사용자도 새로고침 시
 * 순간적으로 미인증 상태로 보일 수 있다.
 */
export function useUserAuthHasHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useUserAuthStore.persist.onFinishHydration(onStoreChange),
    () => useUserAuthStore.persist.hasHydrated(),
    () => false,
  );
}
