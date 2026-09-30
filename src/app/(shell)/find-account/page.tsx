"use client";

import Link from "next/link";
import { useState } from "react";
import { FindAccountTabs, type FindAccountTab } from "@/features/auth/FindAccountTabs";
import { FindEmailPanel } from "@/features/auth/FindEmailPanel";
import { ForgotPasswordPanel } from "@/features/auth/ForgotPasswordPanel";

/**
 * 로그인 화면의 "계정 찾기" 버튼이 여기로 온다. 아이디(이메일) 찾기와 비밀번호 찾기를
 * 탭으로 나눠서 한 화면에서 처리한다 — 비밀번호 찾기 탭은 별도로 만들어둔
 * ForgotPasswordPanel을 그대로 재사용한다(폼/로직 중복 안 되게).
 */
export default function FindAccountPage() {
  const [tab, setTab] = useState<FindAccountTab>("EMAIL");

  return (
    <div className="flex flex-1 flex-col gap-6 py-8">
      <h1 className="heading-small text-center text-zinc-950">계정 찾기</h1>

      <FindAccountTabs value={tab} onChange={setTab} />

      {tab === "EMAIL" ? <FindEmailPanel /> : <ForgotPasswordPanel />}

      <Link href="/login" className="body-small text-center text-zinc-400">
        로그인
      </Link>
    </div>
  );
}
