"use client";

import { useMutation } from "@tanstack/react-query";
import { EnvelopeClosedIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KakaoIcon } from "@/components/icons/KakaoIcon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useUserAuthStore } from "@/store/userAuthStore";
import { emailLogin } from "./api";
import { getKakaoAuthorizeUrl } from "./kakao";

export function LoginPanel() {
  const router = useRouter();
  const setSession = useUserAuthStore((state) => state.setSession);
  const [emailMode, setEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useMutation({
    mutationFn: () => emailLogin({ email, password }),
    onSuccess: (result) => {
      setSession(result);
      router.replace("/");
    },
  });

  return (
    <div className="flex flex-1 flex-col justify-center px-5 pb-24">
      <section className="flex w-full flex-col gap-4">
        <h1 className="heading-regular mb-1 text-center text-zinc-950">축지법</h1>

        {emailMode ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              loginMutation.mutate();
            }}
          >
            <Input
              label="이메일"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="이메일"
            />
            <Input
              label="비밀번호"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호"
            />
            <Button
              type="submit"
              size="lg"
              disabled={loginMutation.isPending}
              className="mt-2 w-full rounded-lg bg-point-600 hover:bg-point-500"
            >
              {loginMutation.isPending ? "로그인 중..." : "로그인하기"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <Button
              type="button"
              size="lg"
              onClick={() => window.location.assign(getKakaoAuthorizeUrl())}
              icon={<KakaoIcon />}
              className="body-regular-bold flex h-[51px] w-full items-center justify-center gap-[6px] rounded-lg bg-[#FEE500] text-[#191919] transition-none hover:bg-[#FEE500]"
            >
              카카오로 3초 만에 시작하기
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon={<EnvelopeClosedIcon />}
              className="body-large h-[51px] w-full gap-[6px] rounded-lg"
              onClick={() => setEmailMode(true)}
            >
              이메일로 로그인
            </Button>
          </div>
        )}

        {loginMutation.isError ? (
          <p className="body-caption text-error">
            {getApiErrorMessage(loginMutation.error, "로그인하지 못했습니다.")}
          </p>
        ) : null}

        <div className="body-small flex items-center justify-center gap-5 pt-2">
          <Link href="/signup" className="body-small text-point-600 underline underline-offset-2">
            회원가입
          </Link>
          <span className="h-3 w-px bg-zinc-300" />
          <button type="button" className="body-small text-zinc-700">
            계정 찾기
          </button>
        </div>
      </section>
    </div>
  );
}
