import axios from "axios";
import { useUserAuthStore } from "@/store/userAuthStore";

// 기본 요청은 같은 출처의 Next.js 프록시를 거쳐 HttpOnly 로그인 쿠키를 함께 보낸다.
// 직접 호출이 필요한 환경에서만 명시적으로 백엔드 주소를 지정한다.
const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";

export const userApiClient = axios.create({
  baseURL: `${backendBaseUrl}/api`,
  withCredentials: true,
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
