"use client";

import { ForgotPasswordPanel } from "@/features/auth/ForgotPasswordPanel";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-5 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="heading-small text-zinc-950">비밀번호 찾기</h1>
        <p className="body-small text-zinc-500">
          가입할 때 쓴 이메일을 입력하시면, 비밀번호를 새로 설정할 수 있는 링크를 보내드려요.
        </p>
      </div>
      <ForgotPasswordPanel />
    </div>
  );
}