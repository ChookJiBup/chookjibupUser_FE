"use client";

import { getKakaoAuthorizeUrl } from "@/features/auth/kakao";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="heading-small text-zinc-950">로그인</h1>
      <a
        href={getKakaoAuthorizeUrl()}
        className="body-regular-bold w-full rounded-lg bg-[#FEE500] px-4 py-3 text-center text-[#191919]"
      >
        카카오로 로그인
      </a>
    </div>
  );
}
