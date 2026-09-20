"use client";

import { HeartIcon } from "@/components/icons/HeartIcon";

import {
  Cross1Icon,
  GearIcon,
  HamburgerMenuIcon,
  MagnifyingGlassIcon,
  PersonIcon,
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
  // 카카오 가입 계정은 닉네임이 비어 올 수 있어서, 그때도 헤더가 " 님"만 남지 않도록 대체 호칭을 쓴다.
  const displayName = session?.nickname?.trim() || "회원";

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

          <div className="flex h-8 shrink-0 items-center gap-3">
            <Link
              href="/search"
              aria-label="축제 검색"
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-zinc-950 hover:bg-zinc-100"
            >
              <MagnifyingGlassIcon className="size-6" />
            </Link>
            {isLoggedIn ? (
              /*
               * 시안의 로그인 상태 헤더는 아바타 + "OOO 님"이다. 로그아웃 버튼이 여기서 빠지는
               * 대신, 이름을 누르면 계정 정보를 보는 마이페이지로 보낸다. 로그아웃 자체는 원래도
               * 햄버거 메뉴 맨 아래에 있었고(시안 메모도 햄버거바에 로그아웃을 둔다), 마이페이지에도
               * 같은 도선을 남겨 둬서 두 경로 모두로 로그아웃할 수 있다.
               */
              <Link
                href="/mypage"
                onClick={closeMenu}
                className="flex h-8 min-w-0 items-center gap-2 rounded-full text-zinc-950 hover:bg-zinc-100"
              >
                {session?.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.profileImageUrl}
                    alt=""
                    className="size-6 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                    <PersonIcon aria-hidden className="size-4" />
                  </span>
                )}
                <span className="body-small max-w-[92px] truncate">{displayName} 님</span>
              </Link>
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
