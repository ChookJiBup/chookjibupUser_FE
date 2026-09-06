"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { kakaoLogin } from "@/features/auth/api";
import { KAKAO_REDIRECT_URI } from "@/features/auth/kakao";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useUserAuthStore } from "@/store/userAuthStore";

const USED_CODE_KEY = "chookjibup:kakao-used-code";

function KakaoCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useUserAuthStore((state) => state.setSession);
  const code = searchParams.get("code");

  const loginMutation = useMutation({
    mutationFn: (authCode: string) =>
      kakaoLogin({ code: authCode, redirectUri: KAKAO_REDIRECT_URI }),
    onSuccess: (result) => {
      setSession(result);
      router.replace("/");
    },
  });

  const { mutate } = loginMutation;
  // 카카오 인가 코드는 1회용이라, 이 코드로 이미 로그인 요청을 보냈으면 다시 보내면 안 된다.
  // ref만으로는 React가 컴포넌트를 다시 렌더링할 때만 막아준다 — 브라우저가 이 페이지를
  // "새로고침"해서 완전히 다시 로드하면(같은 ?code=... 가 URL에 남아있는 채로) ref는
  // 초기화돼서 무력화된다. sessionStorage는 탭을 새로고침해도 값이 남아있어서, 진짜
  // 페이지 새로고침까지 포함해서 막을 수 있다.
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
