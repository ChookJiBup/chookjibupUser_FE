"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { confirmPasswordReset } from "./passwordResetApi";

/**
 * 이메일로 받은 비밀번호 재설정 링크(.../reset-password?token=...)를 클릭하면
 * 도착하는 화면이다. useSearchParams를 쓰는 클라이언트 컴포넌트라 Suspense로 감싼다
 * (카카오 콜백 페이지와 동일한 이유).
 */
export function ResetPasswordPanel() {
  return (
    <Suspense
      fallback={<p className="body-regular p-8 text-center text-zinc-500">불러오는 중...</p>}
    >
      <ResetPasswordPanelInner />
    </Suspense>
  );
}

function ResetPasswordPanelInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("링크에 토큰이 없습니다.");
      return confirmPasswordReset({ token, newPassword, newPasswordConfirm });
    },
    onSuccess: () => {
      setTimeout(() => router.replace("/login"), 1500);
    },
  });

  if (!token) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="body-regular text-error">유효하지 않은 링크예요.</p>
        <Link href="/forgot-password" className="body-regular-bold text-primary">
          다시 요청하기
        </Link>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="body-regular-bold text-zinc-950">비밀번호가 변경됐어요</p>
        <p className="body-small text-zinc-500">잠시 후 로그인 화면으로 이동합니다.</p>
      </div>
    );
  }

  const passwordMismatch = newPasswordConfirm.length > 0 && newPassword !== newPasswordConfirm;

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="heading-small text-zinc-950">새 비밀번호 설정</h1>
        <p className="body-small text-zinc-500">새로 쓸 비밀번호를 입력해주세요.</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!newPassword || newPassword !== newPasswordConfirm) return;
          mutation.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <Input
          label="새 비밀번호"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="새 비밀번호 (8자 이상)"
          autoComplete="new-password"
        />
        <Input
          label="새 비밀번호 확인"
          type="password"
          value={newPasswordConfirm}
          onChange={(event) => setNewPasswordConfirm(event.target.value)}
          placeholder="새 비밀번호 확인"
          autoComplete="new-password"
        />
        {passwordMismatch ? (
          <p className="body-caption text-error">비밀번호가 일치하지 않아요.</p>
        ) : null}

        {mutation.isError ? (
          <p className="body-caption text-error">
            {getApiErrorMessage(mutation.error, "비밀번호를 변경하지 못했습니다.")}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={
            mutation.isPending ||
            !newPassword ||
            newPassword.length < 8 ||
            newPassword !== newPasswordConfirm
          }
        >
          비밀번호 변경하기
        </Button>
      </form>
    </div>
  );
}
