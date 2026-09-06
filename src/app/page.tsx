"use client";

import { FestivalListPanel } from "@/features/festivals/FestivalListPanel";

/**
 * 홈(축제 목록). 비회원도 볼 수 있어야 한다 — 백엔드 GET /api/festivals가
 * 원래 비회원 조회를 지원하도록 설계돼 있다. 로그인 여부에 따른 차이(찜 하트
 * 표시 여부 등)는 FestivalListPanel/FestivalCard가 내부적으로 이미 처리한다 —
 * 그래서 여기서 로그인을 강제로 막으면 안 된다.
 */
export default function Home() {
  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <h1 className="heading-small text-zinc-950">축제 목록</h1>
      </div>
      <FestivalListPanel />
    </div>
  );
}
