import axios from "axios";
import { useUserAuthStore } from "@/store/userAuthStore";

// 백엔드가 /api/auth, /api/festivals, /api/wishlists를 같은 사용자 JWT로 인증하므로
// baseURL은 공통 루트로 두고, 각 API 함수가 나머지 경로를 명시한다.
export const userApiClient = axios.create({
  baseURL: "/api",
});

userApiClient.interceptors.request.use((config) => {
  const session = useUserAuthStore.getState().session;
  if (session) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

userApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useUserAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  },
);
