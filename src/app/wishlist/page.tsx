"use client";

import Link from "next/link";
import { WishlistPanel } from "@/features/wishlist/WishlistPanel";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";

export default function WishlistPage() {
  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);

  if (!hasHydrated) return null;

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 p-8">
        <p className="body-regular text-zinc-500">로그인 후 찜한 축제를 볼 수 있어요.</p>
        <Link href="/login" className="body-regular-bold text-primary">
          로그인하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <h1 className="heading-small text-zinc-950">찜한 축제</h1>
      </div>
      <WishlistPanel />
    </div>
  );
}
