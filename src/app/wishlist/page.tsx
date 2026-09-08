"use client";

import Link from "next/link";
import { UserAuthGuard } from "@/components/auth/UserAuthGuard";
import { WishlistPanel } from "@/features/wishlist/WishlistPanel";

export default function WishlistPage() {
  const loginFallback = (
    <div className="flex flex-col items-center gap-3 p-8">
      <p className="body-regular text-zinc-500">로그인 후 찜한 축제를 볼 수 있어요.</p>
      <Link href="/login" className="body-regular-bold text-primary">
        로그인하러 가기
      </Link>
    </div>
  );

  // 헤더(뒤로가기/편집모드 X버튼 + 수정하기/삭제하기)는 WishlistPanel이 편집 모드
  // 상태에 따라 직접 그린다 — 여기서는 로그인 여부만 확인한다.
  return <UserAuthGuard fallback={loginFallback}>{<WishlistPanel />}</UserAuthGuard>;
}
