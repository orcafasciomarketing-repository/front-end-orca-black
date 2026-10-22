import { getSdrRanking } from "../api/dashboardApi";
import { useSuspenseQuery } from "@tanstack/react-query";

import { sortDescBy } from "../utils/sortDescBy";
import { dashboardKeys, REFETCH_INTERVAL } from "./dashboardKeys";

const sortByPoints = sortDescBy("points");

export function useSdrRanking(period) {
  const { data } = useSuspenseQuery({
    queryKey: dashboardKeys.sdrRanking(period),
    queryFn: () => getSdrRanking(period),
    select: sortByPoints,
    refetchInterval: REFETCH_INTERVAL,
  });

  return { sdrs: data };
}
