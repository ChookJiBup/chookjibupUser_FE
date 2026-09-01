"use client";

import { LoginPanel } from "@/features/auth/LoginPanel";
import { FestivalListPanel } from "@/features/festivals/FestivalListPanel";
import { UserAuthGuard } from "@/components/auth/UserAuthGuard";

export default function Home() {
  return (
    <UserAuthGuard fallback={<LoginPanel />}>
      <div className="flex flex-col">
        <div className="px-4 py-4">
          <h1 className="heading-small text-zinc-950">축제 목록</h1>
        </div>
        <FestivalListPanel />
      </div>
    </UserAuthGuard>
  );
}
