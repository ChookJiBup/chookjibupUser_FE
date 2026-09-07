import axios from "axios";
import { useUserAuthStore } from "@/store/userAuthStore";

// [수정] 기본값을 localhost가 아니라 배포된 백엔드 주소로 바꿨다 — Vercel에
// NEXT_PUBLIC_API_BASE_URL 환경변수 설정이 누락/미반영되는 문제가 반복돼서,
// "환경변수 없으면 배포 주소를 쓴다"가 훨씬 안전한 기본값이다. 로컬 개발 시엔
// .env.local에 NEXT_PUBLIC_API_BASE_URL=http://localhost:8080을 넣어서
// 이 기본값을 덮어쓰면 된다.
const backendBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "https://user-api.chookjibup.store";

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
