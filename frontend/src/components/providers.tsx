"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";
import { BusinessProvider } from "./BusinessContext";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    // no-op
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BusinessProvider>{children}</BusinessProvider>
    </QueryClientProvider>
  );
}
