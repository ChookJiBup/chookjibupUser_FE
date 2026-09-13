"use client";

import Link from "next/link";
import { useState } from "react";
import { FindEmailPanel } from "@/features/auth/FindEmailPanel";
import { ForgotPasswordPanel } from "@/features/auth/ForgotPasswordPanel";

type Tab = "EMAIL" | "PASSWORD";

const TAB_LABEL: Record<Tab, string> = {
  EMAIL: "아이디 찾기",
  PASSWORD: "비밀번호 찾기",
};

/**
 * 로그인 화면의 "계정 찾기" 버튼이 여기로 온다. 아이디(이메일) 찾기와 비밀번호 찾기를
 * 탭으로 나눠서 한 화면에서 처리한다 — 비밀번호 찾기 탭은 별도로 만들어둔
 * ForgotPasswordPanel을 그대로 재사용한다(폼/로직 중복 안 되게).
 */
export default function FindAccountPage() {
  const [tab, setTab] = useState<Tab>("EMAIL");

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 py-8">
      <h1 className="heading-small text-center text-zinc-950">계정 찾기</h1>

      <div className="flex border-b border-zinc-200">
        {(Object.keys(TAB_LABEL) as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={
              tab === value
                ? "body-regular-bold flex-1 border-b-2 border-point-600 py-3 text-center text-zinc-950"
                : "body-regular flex-1 py-3 text-center text-zinc-400"
            }
          >
            {TAB_LABEL[value]}
          </button>
        ))}
      </div>

      {tab === "EMAIL" ? <FindEmailPanel /> : <ForgotPasswordPanel />}

      <Link href="/login" className="body-small text-center text-zinc-400">
        로그인 화면으로 돌아가기
      </Link>
    </div>
  );
}
