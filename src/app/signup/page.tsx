"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  confirmEmailVerification,
  emailSignup,
  requestEmailVerification,
} from "@/features/auth/api";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useUserAuthStore } from "@/store/userAuthStore";

export default function SignupPage() {
  const router = useRouter();
  const setSession = useUserAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const requestMutation = useMutation({
    mutationFn: () => requestEmailVerification({ email }),
    onSuccess: () => setEmailSent(true),
  });
  const confirmMutation = useMutation({
    mutationFn: () => confirmEmailVerification({ email, code }),
    onSuccess: () => setEmailVerified(true),
  });
  const signupMutation = useMutation({
    mutationFn: () =>
      emailSignup({
        email,
        password,
        passwordConfirm,
        nickname,
        phoneNumber: phoneNumber || undefined,
        birthDate: birthDate || undefined,
      }),
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
  const error = requestMutation.error ?? confirmMutation.error ?? signupMutation.error;

  return (
    <div className="flex flex-1 flex-col gap-5 p-6">
      <h1 className="heading-small text-zinc-950">이메일 회원가입</h1>
      <div className="flex gap-2">
        <input
          type="email"
          required
          disabled={emailVerified}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="이메일"
          className="body-regular min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2"
        />
        <button
          type="button"
          disabled={!email || emailVerified || requestMutation.isPending}
          onClick={() => requestMutation.mutate()}
          className="body-small-bold rounded-lg bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
        >
          인증코드 발송
        </button>
      </div>
      {emailSent && !emailVerified ? (
        <div className="flex gap-2">
          <input
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="인증코드 6자리"
            className="body-regular min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2"
          />
          <button
            type="button"
            disabled={!code || confirmMutation.isPending}
            onClick={() => confirmMutation.mutate()}
            className="body-small-bold rounded-lg bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
          >
            인증 확인
          </button>
        </div>
      ) : null}
      {emailVerified ? <p className="body-small text-zinc-600">이메일 인증이 완료됐어요.</p> : null}
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          signupMutation.mutate();
        }}
      >
        <input
          required
          minLength={8}
          maxLength={64}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호 (8자 이상)"
          className="body-regular rounded-lg border border-zinc-300 px-3 py-2"
        />
        <input
          required
          type="password"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          placeholder="비밀번호 확인"
          className="body-regular rounded-lg border border-zinc-300 px-3 py-2"
        />
        <input
          required
          maxLength={100}
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="닉네임"
          className="body-regular rounded-lg border border-zinc-300 px-3 py-2"
        />
        <input
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          placeholder="전화번호 (선택)"
          className="body-regular rounded-lg border border-zinc-300 px-3 py-2"
        />
        <label className="body-small text-zinc-600">
          생년월일 (선택)
          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="body-regular mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950"
          />
        </label>
        <button
          type="submit"
          disabled={!emailVerified || signupMutation.isPending || password !== passwordConfirm}
          className="body-regular-bold rounded-lg bg-primary px-4 py-3 text-white disabled:opacity-50"
        >
          가입하기
        </button>
      </form>
      {error ? (
        <p className="body-caption text-error">
          {getApiErrorMessage(error, "요청을 처리하지 못했습니다.")}
        </p>
      ) : null}
    </div>
  );
}
