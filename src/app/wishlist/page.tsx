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

  return (
    <UserAuthGuard fallback={loginFallback}>
      <div className="flex flex-col">
        <div className="px-4 py-4">
          <h1 className="heading-small text-zinc-950">찜한 축제</h1>
        </div>
        <WishlistPanel />
      </div>
    </UserAuthGuard>
  );
}
