"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AgreementList } from "@/components/ui/AgreementList";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import {
  confirmEmailVerification,
  emailSignup,
  requestEmailVerification,
} from "@/features/auth/api";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useUserAuthStore } from "@/store/userAuthStore";

const AGREEMENTS = [
  "축지법 서비스 이용약관",
  "개인정보 수집 및 이용동의",
  "개인정보 취급 위탁 동의",
] as const;

export function SignupPanel() {
  const router = useRouter();
  const setSession = useUserAuthStore((state) => state.setSession);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [agreements, setAgreements] = useState<boolean[]>(AGREEMENTS.map(() => false));
  const [nickname, setNickname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const requestMutation = useMutation({
    mutationFn: () => requestEmailVerification({ email }),
    onSuccess: () => {
      setEmailSent(true);
      setEmailVerified(false);
      setRemainingSeconds(5 * 60);
      setCode("");
      confirmMutation.reset();
    },
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
      setSession(result);
      router.replace("/");
    },
  });

  const allAgreed = agreements.every(Boolean);
  const passwordValid = password.length >= 8 && password === passwordConfirm;
  const canContinue = emailVerified && passwordValid && allAgreed;
  const canSubmit = nickname.trim() !== "" && phoneNumber.trim() !== "" && birthDate !== "";
  const verificationError = requestMutation.error ?? confirmMutation.error;
  const remainingTime = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(
    remainingSeconds % 60,
  ).padStart(2, "0")}`;

  useEffect(() => {
    if (!emailSent || emailVerified || remainingSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [emailSent, emailVerified, remainingSeconds]);

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="heading-regular text-center text-zinc-950">회원가입</h1>

      {step === 1 ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-end gap-2">
              <Input
                label="이메일"
                type="email"
                autoComplete="email"
                required
                disabled={emailVerified}
                className={
                  emailVerified
                    ? "user-verified border-point-600 bg-point-300 text-zinc-950 disabled:border-point-600 disabled:bg-point-300 disabled:text-zinc-950"
                    : undefined
                }
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="이메일"
              />
              <Button
                size="default"
                disabled={!email || emailVerified || requestMutation.isPending}
                onClick={() => requestMutation.mutate()}
                className="h-[42px] shrink-0 rounded-lg bg-point-600 px-3 hover:bg-point-500"
              >
                {emailSent ? "인증번호 다시보내기" : "인증번호 보내기"}
              </Button>
            </div>
            {verificationError ? (
              <p className="body-small text-error">
                {getApiErrorMessage(verificationError, "인증번호 요청을 처리하지 못했습니다.")}
              </p>
            ) : null}
            {emailVerified ? (
              <p className="body-small text-left text-point-600">이메일 인증이 완료됐어요.</p>
            ) : null}
          </div>

          {emailSent && !emailVerified ? (
            <div className="flex items-end gap-2">
              <Input
                label="인증번호"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="인증번호"
                helperText={`남은 시간 ${remainingTime}`}
                helperTextClassName="body-small w-full text-left text-error"
              />
              <Button
                disabled={!code || remainingSeconds <= 0 || confirmMutation.isPending}
                onClick={() => confirmMutation.mutate()}
                className="mb-[23px] h-[42px] shrink-0 rounded-lg bg-point-600 px-4 hover:bg-point-500"
              >
                인증하기
              </Button>
            </div>
          ) : null}

          <Input
            label="비밀번호"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호"
          />
          <Input
            label="비밀번호 확인"
            type="password"
            autoComplete="new-password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            placeholder="비밀번호 확인"
            errorText={
              passwordConfirm && password !== passwordConfirm
                ? "비밀번호가 일치하지 않습니다."
                : undefined
            }
          />

          <div className="mt-1">
            <AgreementList
              items={AGREEMENTS.map((label) => ({ label, required: true }))}
              checkedItems={agreements}
              onCheckedItemsChange={setAgreements}
            />
          </div>

          <Button
            size="lg"
            disabled={!canContinue}
            onClick={() => setStep(2)}
            className="w-full rounded-lg bg-point-600 hover:bg-point-500"
          >
            다음
          </Button>
        </div>
      ) : (
        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            signupMutation.mutate();
          }}
        >
          <Input
            label="이름"
            required
            maxLength={100}
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="이름"
          />
          <PhoneInput
            label="전화번호"
            required
            value={phoneNumber}
            onValueChange={setPhoneNumber}
            placeholder="전화번호"
          />
          <Input
            label="생년월일"
            type="date"
            required
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit || signupMutation.isPending}
            className="mt-1 w-full rounded-lg bg-point-600 hover:bg-point-500"
          >
            {signupMutation.isPending ? "가입 중..." : "회원가입"}
          </Button>
        </form>
      )}

      {signupMutation.error ? (
        <p className="body-caption mt-3 text-error">
          {getApiErrorMessage(signupMutation.error, "요청을 처리하지 못했습니다.")}
        </p>
      ) : null}
    </div>
  );
}
