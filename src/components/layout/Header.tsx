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

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    // [중요] 드로어/딤드 배경을 <header> "바깥"(형제)으로 뺐다. <header>가
    // sticky라서(=포지션 기준점이 됨), absolute 자식을 header 안에 두면
    // header 자신의 높이(48px)를 기준으로 좌표가 잡혀서 드로어가 거의 찌그러진다.
    // Fragment로 감싸서 .mobile-app-shell(position:relative, 402px 폭) 바로
    // 아래 형제로 두면, 그게 진짜 기준점이 된다.
    <>
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
        <>
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={closeMenu}
            className="absolute inset-x-0 bottom-0 top-12 z-10 bg-zinc-950/40"
          />
          <nav className="absolute bottom-0 left-0 top-12 z-10 flex w-[80%] max-w-[322px] flex-col bg-white pb-6 shadow-xl">
            {!isLoggedIn ? (
              <Link href="/login" onClick={closeMenu} className="body-regular px-5 py-4">
                로그인
              </Link>
            ) : null}
            <Link href="/search" onClick={closeMenu} className="body-regular px-5 py-4">
              검색하기
            </Link>

            {isLoggedIn ? (
              <>
                <div className="h-2 bg-zinc-50" />
                <Link href="/wishlist" onClick={closeMenu} className="body-regular px-5 py-4">
                  내가 저장한 축제
                </Link>
                <Link href="/mypage" onClick={closeMenu} className="body-regular px-5 py-4">
                  마이페이지
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    handleLogout();
                  }}
                  className="body-regular mt-auto px-5 py-4 text-left text-zinc-500"
                >
                  로그아웃
                </button>
              </>
            ) : null}
          </nav>
        </>
      ) : null}
    </>
  );
}
