import { Suspense } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function renderWithQuery(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>{ui}</Suspense>
    </QueryClientProvider>,
  );

  return { ...result, queryClient };
}
