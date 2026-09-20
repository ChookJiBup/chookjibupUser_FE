"use client";

import Link from "next/link";
import { UserAuthGuard } from "@/components/auth/UserAuthGuard";
import { MyReviewsPanel } from "@/features/reviews/MyReviewsPanel";

export default function MyReviewsPage() {
  const loginFallback = (
    <div className="flex flex-col items-center gap-3 p-8">
      <p className="body-regular text-zinc-500">로그인 후 내가 쓴 리뷰를 볼 수 있어요.</p>
      <Link href="/login" className="body-regular-bold text-primary">
        로그인하러 가기
      </Link>
    </div>
  );

  // 헤더(뒤로가기)는 MyReviewsPanel이 직접 그린다 — 여기서는 로그인 여부만 확인한다.
  return <UserAuthGuard fallback={loginFallback}>{<MyReviewsPanel />}</UserAuthGuard>;
}
