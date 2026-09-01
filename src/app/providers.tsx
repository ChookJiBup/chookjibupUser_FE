"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/features/auth/api";
import { useUserAuthStore } from "@/store/userAuthStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const setSession = useUserAuthStore((state) => state.setSession);
  const markSessionChecked = useUserAuthStore((state) => state.markSessionChecked);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setSession(user))
      .catch(() => markSessionChecked());
  }, [markSessionChecked, setSession]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
