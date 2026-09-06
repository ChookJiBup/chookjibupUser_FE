"use client";

import Link from "next/link";
import { UserAuthGuard } from "@/components/auth/UserAuthGuard";
import { useUserAuthStore } from "@/store/userAuthStore";

/**
 * 마이페이지. MENU01 설계서엔 있지만 프로필 수정/설정 같은 상세 기능은
 * 아직 정의된 게 없어서, 지금은 로그인한 계정 정보 확인 + 로그아웃 도선 정도의
 * 최소 스텁이다. 나중에 실제 마이페이지 요구사항이 나오면 채워야 한다.
 */
export default function MyPage() {
  return (
    <UserAuthGuard
      fallback={
        <div className="flex flex-col items-center gap-3 p-8">
          <p className="body-regular text-zinc-500">로그인이 필요해요.</p>
          <Link href="/login" className="body-regular-bold text-primary">
            로그인하러 가기
          </Link>
        </div>
      }
    >
      <MyPageContent />
    </UserAuthGuard>
  );
}

function MyPageContent() {
  const session = useUserAuthStore((state) => state.session);
  if (!session) return null;

  return (
    <div className="flex flex-col gap-4 p-5">
      <h1 className="heading-small text-zinc-950">마이페이지</h1>
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4">
        {session.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.profileImageUrl} alt="" className="size-12 rounded-full object-cover" />
        ) : (
          <div className="size-12 rounded-full bg-zinc-100" />
        )}
        <div className="flex flex-col">
          <p className="body-regular-bold text-zinc-950">{session.nickname}</p>
          {session.email ? <p className="body-small text-zinc-500">{session.email}</p> : null}
        </div>
      </div>

      <div className="flex flex-col divide-y divide-zinc-100 rounded-lg border border-zinc-200">
        <Link href="/wishlist" className="body-regular px-4 py-3 text-zinc-950">
          내가 저장한 축제
        </Link>
      </div>
    </div>
  );
}
