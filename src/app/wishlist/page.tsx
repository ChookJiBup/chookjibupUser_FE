"use client";

import Link from "next/link";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
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
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
          <Link href="/" aria-label="뒤로가기">
            <ChevronLeftIcon className="size-5 text-zinc-700" />
          </Link>
          <h1 className="body-large-bold text-zinc-950">내가 저장한 축제</h1>
        </div>
        <WishlistPanel />
      </div>
    </UserAuthGuard>
  );
}
