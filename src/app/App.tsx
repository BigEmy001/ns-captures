import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./routes";
import { GlobalErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <SentryErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GlobalErrorBoundary>
          <RouterProvider router={router} />
        </GlobalErrorBoundary>
      </QueryClientProvider>
    </SentryErrorBoundary>
  );
}

import * as Sentry from "@sentry/react";

const SentryErrorBoundary = Sentry.ErrorBoundary;
