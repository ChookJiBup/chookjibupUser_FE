"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { requestPasswordReset } from "./passwordResetApi";

/**
 * 비밀번호를 잊었을 때, 가입한 이메일로 재설정 링크를 보내는 화면이다.
 * FindAccountPanel의 "비밀번호 찾기" 탭이 이 패널을 그대로 재사용한다
 * (별도 페이지로 직접 들어올 수도 있게 /forgot-password 라우트도 남겨뒀다).
 */
export function ForgotPasswordPanel() {
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () => requestPasswordReset(email),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    mutation.mutate();
  }

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="body-regular-bold text-zinc-950">이메일을 보냈어요</p>
        <p className="body-small text-zinc-500">
          {email}로 비밀번호 재설정 링크를 보냈습니다.
          <br />
          메일함(스팸함도 확인)을 확인해주세요. 링크는 30분간 유효합니다.
        </p>
        <Link href="/login" className="body-regular-bold mt-2 text-primary">
          로그인 화면으로
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="이메일"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="가입한 이메일"
        autoComplete="email"
      />

      {mutation.isError ? (
        <p className="body-caption text-error">
          {getApiErrorMessage(mutation.error, "요청을 처리하지 못했습니다.")}
        </p>
      ) : null}

      <Button type="submit" disabled={mutation.isPending || !email.trim()}>
        재설정 링크 보내기
      </Button>
    </form>
  );
}
