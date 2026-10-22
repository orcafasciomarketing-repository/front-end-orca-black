import { getGoal } from "../api/dashboardApi";
import { useSuspenseQuery } from "@tanstack/react-query";

import { dashboardKeys, REFETCH_INTERVAL } from "./dashboardKeys";

export function useGoal() {
  const { data } = useSuspenseQuery({
    queryKey: dashboardKeys.goal,
    queryFn: getGoal,
    refetchInterval: REFETCH_INTERVAL,
  });

  return { goal: data };
}
