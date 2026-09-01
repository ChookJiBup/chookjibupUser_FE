"use client";

import { LoginPanel } from "@/features/auth/LoginPanel";
import { FestivalListPanel } from "@/features/festivals/FestivalListPanel";
import { useUserAuthHasHydrated, useUserAuthStore } from "@/store/userAuthStore";

export default function Home() {
  const hasHydrated = useUserAuthHasHydrated();
  const sessionIsValid = useUserAuthStore((state) => state.session !== null);

  if (!hasHydrated || !sessionIsValid) {
    return <LoginPanel />;
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <h1 className="heading-small text-zinc-950">축제 목록</h1>
      </div>
      <FestivalListPanel />
    </div>
  );
}
