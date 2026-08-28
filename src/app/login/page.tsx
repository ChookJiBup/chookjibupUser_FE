"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { emailLogin } from "@/features/auth/api";
import { getKakaoAuthorizeUrl } from "@/features/auth/kakao";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useUserAuthStore } from "@/store/userAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useUserAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useMutation({
    mutationFn: () => emailLogin({ email, password }),
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="heading-small text-zinc-950">로그인</h1>
      <form
        className="flex w-full flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          loginMutation.mutate();
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="이메일"
          className="body-regular rounded-lg border border-zinc-300 px-4 py-3"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호"
          className="body-regular rounded-lg border border-zinc-300 px-4 py-3"
        />
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="body-regular-bold rounded-lg bg-primary px-4 py-3 text-white disabled:opacity-50"
        >
          이메일로 로그인
        </button>
        {loginMutation.isError ? (
          <p className="body-caption text-error">
            {getApiErrorMessage(loginMutation.error, "로그인하지 못했습니다.")}
          </p>
        ) : null}
      </form>
      <div className="flex w-full items-center gap-3">
        <span className="h-px flex-1 bg-zinc-200" />
        <span className="body-caption text-zinc-400">또는</span>
        <span className="h-px flex-1 bg-zinc-200" />
      </div>
      <a
        href={getKakaoAuthorizeUrl()}
        className="body-regular-bold w-full rounded-lg bg-[#FEE500] px-4 py-3 text-center text-[#191919]"
      >
        카카오로 로그인
      </a>
      <Link href="/signup" className="body-small-bold text-primary">
        이메일로 회원가입
      </Link>
    </div>
  );
}
