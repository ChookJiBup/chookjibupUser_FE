"use client";

import { Cross1Icon, HamburgerMenuIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { logout } from "@/features/auth/api";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";

export function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasHydrated = useUserAuthHasHydrated();
  const session = useUserAuthStore((state) => state.session);
  const clearSession = useUserAuthStore((state) => state.clearSession);
  const isLoggedIn = hasHydrated && session !== null;

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearSession();
      router.replace("/login");
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white">
      <div className="flex h-12 items-center justify-between px-5">
        <div className="flex h-8 w-[84px] shrink-0 items-center gap-3">
          <IconButton
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            variant="ghost"
            size="default"
            className="h-8 w-6 p-0"
            icon={
              menuOpen ? (
                <Cross1Icon className="h-8 w-6" />
              ) : (
                <HamburgerMenuIcon className="h-8 w-6" />
              )
            }
            onClick={() => setMenuOpen((open) => !open)}
          />
          <Link
            href="/"
            className="body-caption flex h-8 w-12 shrink-0 items-center justify-center rounded bg-zinc-100 text-zinc-950"
          >
            축지법
          </Link>
        </div>

        <div className="flex h-8 w-[105px] shrink-0 items-center gap-3">
          <Link
            href="/?search=open"
            aria-label="축제 검색"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-zinc-950 hover:bg-zinc-100"
          >
            <MagnifyingGlassIcon className="size-6" />
          </Link>
          {isLoggedIn ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-8 w-[69px] px-0"
            >
              로그아웃
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/login")}
              className="h-8 w-[69px] px-0"
            >
              로그인
            </Button>
          )}
        </div>
      </div>

      {menuOpen ? (
        <nav className="absolute inset-x-0 top-12 flex flex-col border-y border-zinc-200 bg-white px-4 py-3 shadow-lg">
          <Link href="/" onClick={() => setMenuOpen(false)} className="body-regular py-2">
            축제 둘러보기
          </Link>
          <Link href="/wishlist" onClick={() => setMenuOpen(false)} className="body-regular py-2">
            찜한 축제
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
