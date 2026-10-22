import { useSuspenseQuery } from "@tanstack/react-query";

import { getErrorLogs } from "../api/logsApi";

const REFETCH_INTERVAL = 30 * 1000;

export function useErrorLogs() {
  const { data } = useSuspenseQuery({
    queryKey: ["error-logs"],
    queryFn: getErrorLogs,
    refetchInterval: REFETCH_INTERVAL,
  });

  return { logs: data };
}
