"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { kakaoLogin } from "@/features/auth/api";
import { KAKAO_REDIRECT_URI } from "@/features/auth/kakao";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useUserAuthStore } from "@/store/userAuthStore";

function KakaoCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useUserAuthStore((state) => state.setSession);
  const code = searchParams.get("code");

  const loginMutation = useMutation({
    mutationFn: (authCode: string) =>
      kakaoLogin({ code: authCode, redirectUri: KAKAO_REDIRECT_URI }),
    onSuccess: (result) => {
      setSession(
        result.accessToken,
        result.accessTokenExpiresInSeconds,
        result.nickname,
        result.email,
        result.profileImageUrl,
      );
      router.replace("/");
    },
  });

  const { mutate } = loginMutation;
  useEffect(() => {
    if (code) mutate(code);
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
