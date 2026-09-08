"use client";

import { HeartIcon } from "@/components/icons/HeartIcon";

import {
  Cross1Icon,
  GearIcon,
  HamburgerMenuIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
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

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white pt-[var(--app-safe-top)]">
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
              onClick={() => {
                closeMenu();
                window.dispatchEvent(new Event("festival-home-reset"));
              }}
              className="body-caption flex h-8 w-12 shrink-0 items-center justify-center rounded bg-zinc-100 text-zinc-950"
            >
              축지법
            </Link>
          </div>

          <div className="flex h-8 w-[105px] shrink-0 items-center gap-3">
            <Link
              href="/search"
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
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 mx-auto w-full max-w-[var(--app-max-width)]">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={closeMenu}
            className="absolute inset-0 bg-zinc-950/40"
          />
          <nav className="absolute inset-y-0 left-0 flex w-[80%] max-w-[322px] flex-col bg-white pb-[calc(26px+var(--app-safe-bottom))] pt-[calc(var(--app-safe-top)+16px)] shadow-xl">
            {!isLoggedIn ? (
              <Link
                href="/login"
                onClick={closeMenu}
                className="body-regular-bold flex h-[52px] shrink-0 items-center px-7 py-3.5 text-point-600"
              >
                로그인
              </Link>
            ) : null}
            <Link
              href="/search"
              onClick={closeMenu}
              className="body-regular flex h-[52px] shrink-0 items-center gap-2 px-7 py-3.5 text-zinc-800"
            >
              <MagnifyingGlassIcon aria-hidden className="size-4 shrink-0" />
              검색하기
            </Link>

            {!isLoggedIn && <hr className="mx-5 border-0 border-t border-zinc-100" />}
            {isLoggedIn ? (
              <>
                <Link
                  href="/wishlist"
                  onClick={closeMenu}
                  className="body-regular flex h-[52px] shrink-0 items-center gap-2 px-7 py-3.5 text-zinc-800"
                >
                  <HeartIcon filled aria-hidden className="size-4 shrink-0" />
                  내가 저장한 축제
                </Link>
                <Link
                  href="/mypage"
                  onClick={closeMenu}
                  className="body-regular flex h-[52px] shrink-0 items-center gap-2 px-7 py-3.5 text-zinc-800"
                >
                  <GearIcon aria-hidden className="size-4 shrink-0" />
                  마이페이지
                </Link>
                <hr className="mx-5 border-0 border-t border-zinc-100" />

                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    handleLogout();
                  }}
                  className="body-regular mt-auto h-[52px] shrink-0 px-7 py-3.5 text-left text-zinc-800"
                >
                  로그아웃
                </button>
              </>
            ) : null}
          </nav>
        </div>
      ) : null}
    </>
  );
}
