"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { getCurrentUser, kakaoLogin } from "@/features/auth/api";
import { getKakaoRedirectUri } from "@/features/auth/kakao";
import { takeLoginReturn } from "@/features/auth/loginReturn";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useUserAuthStore } from "@/store/userAuthStore";

const USED_CODE_KEY = "chookjibup:kakao-used-code";

function KakaoCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useUserAuthStore((state) => state.setSession);
  const code = searchParams.get("code");
  const oauthState = searchParams.get("state");

  const loginMutation = useMutation({
    mutationFn: async (authCode: string) => {
      await kakaoLogin({ code: authCode, redirectUri: getKakaoRedirectUri() });
      return getCurrentUser();
    },
    onSuccess: (result) => {
      setSession(result);
      router.replace(takeLoginReturn(oauthState));
    },
  });

  const { mutate } = loginMutation;
  // 1회용 인가 코드가 새로고침으로 재사용되는 것을 막는다.
  useEffect(() => {
    if (!code) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(USED_CODE_KEY) === code) return;

    window.sessionStorage.setItem(USED_CODE_KEY, code);
    mutate(code);
  }, [code, mutate]);

  if (!code) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="body-small text-error">카카오 인가 코드가 없습니다.</p>
        <a href="/login" className="body-regular-bold text-primary">
          다시 시도
        </a>
      </div>
    );
  }

  if (loginMutation.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <p className="body-small text-error">{getApiErrorMessage(loginMutation.error)}</p>
        <a href="/login" className="body-regular-bold text-primary">
          다시 시도
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <p className="body-regular text-zinc-500">로그인 처리 중...</p>
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="body-regular text-zinc-500">로그인 처리 중...</p>
        </div>
      }
    >
      <KakaoCallbackInner />
    </Suspense>
  );
}
