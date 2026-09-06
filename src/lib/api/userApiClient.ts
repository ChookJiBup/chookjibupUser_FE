import axios from "axios";
import { useUserAuthStore } from "@/store/userAuthStore";

// [중요] Next.js 개발 서버의 rewrites()가 특정 상황에서 POST 요청 body를 백엔드로
// 온전히 못 넘기는 문제가 확인돼서(카카오 로그인 code가 서버에 빈 값으로 도착),
// 프록시를 거치지 않고 브라우저가 백엔드에 직접 요청하도록 바꿨다. 백엔드
// SecurityConfig의 CORS 허용 목록에 이미 이 오리진들이 등록돼 있어야 한다.
const backendBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "http://localhost:8080";

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
