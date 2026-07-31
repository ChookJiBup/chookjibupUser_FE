"use client";

import Link from "next/link";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";

export function Header() {
  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const clearSession = useUserAuthStore((state) => state.clearSession);
  const isLoggedIn = hasHydrated && session !== null;

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
      <Link href="/" className="heading-small text-zinc-950">
        축지법
      </Link>
      <nav className="flex items-center gap-3">
        <Link href="/wishlist" className="body-small text-zinc-700">
          찜
        </Link>
        {isLoggedIn ? (
          <button type="button" onClick={clearSession} className="body-small text-zinc-700">
            {session.nickname} 님 · 로그아웃
          </button>
        ) : (
          <Link href="/login" className="body-small-bold text-primary">
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
}
