import { useSuspenseQuery } from "@tanstack/react-query";

import { getTestReport } from "../api/logsApi";

export function useTestReport() {
  const { data } = useSuspenseQuery({
    queryKey: ["test-report"],
    queryFn: getTestReport,
  });

  return { report: data };
}
