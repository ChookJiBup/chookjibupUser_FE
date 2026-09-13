"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { findEmail } from "./findEmailApi";

/**
 * 아이디(이메일) 찾기. 회원가입 때 입력한 이름(=닉네임)과 생년월일로 계정을 찾는다.
 * 카카오 로그인 계정은 대상이 아니다(이메일+비밀번호 로그인 개념이 없어서) —
 * 그런 경우 백엔드가 "계정을 찾을 수 없다"는 에러를 그대로 돌려준다.
 */
export function FindEmailPanel() {
  const [nickname, setNickname] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const mutation = useMutation({
    mutationFn: () => findEmail({ nickname, birthDate }),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!nickname.trim() || !birthDate) return;
    mutation.mutate();
  }

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="body-regular-bold text-zinc-950">가입된 이메일을 찾았어요</p>
        <p className="heading-small text-point-600">{mutation.data.maskedEmail}</p>
        <p className="body-caption text-zinc-400">개인정보 보호를 위해 일부를 가려서 보여드려요.</p>
        <button
          type="button"
          onClick={() => mutation.reset()}
          className="body-small mt-2 text-zinc-500 underline underline-offset-2"
        >
          다시 찾기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="이름"
        value={nickname}
        onChange={(event) => setNickname(event.target.value)}
        placeholder="회원가입 때 입력한 이름"
        autoComplete="name"
      />
      <Input
        label="생년월일"
        type="date"
        value={birthDate}
        onChange={(event) => setBirthDate(event.target.value)}
      />

      {mutation.isError ? (
        <p className="body-caption text-error">
          {getApiErrorMessage(mutation.error, "일치하는 계정을 찾지 못했습니다.")}
        </p>
      ) : null}

      <Button type="submit" disabled={mutation.isPending || !nickname.trim() || !birthDate}>
        이메일 찾기
      </Button>
    </form>
  );
}
