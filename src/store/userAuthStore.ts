import { create } from "zustand";

export interface UserSession {
  nickname: string;
  email: string | null;
  profileImageUrl: string | null;
}

interface UserAuthState {
  session: UserSession | null;
  sessionChecked: boolean;
  setSession: (session: UserSession) => void;
  clearSession: () => void;
  markSessionChecked: () => void;
}

// Access Token은 HttpOnly 쿠키로만 관리하고 브라우저 저장소에 보관하지 않는다.
export const useUserAuthStore = create<UserAuthState>((set) => ({
  session: null,
  sessionChecked: false,
  setSession: (session) => set({ session, sessionChecked: true }),
  clearSession: () => set({ session: null, sessionChecked: true }),
  markSessionChecked: () => set({ sessionChecked: true }),
}));

/**
 * HttpOnly 쿠키로 /auth/me 확인을 끝냈는지 나타낸다.
 */
export function useUserAuthHasHydrated(): boolean {
  return useUserAuthStore((state) => state.sessionChecked);
}
