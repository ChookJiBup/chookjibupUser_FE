"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { UserSessionBootstrap } from "@/features/auth/UserSessionBootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <UserSessionBootstrap />
      {children}
    </QueryClientProvider>
  );
}
