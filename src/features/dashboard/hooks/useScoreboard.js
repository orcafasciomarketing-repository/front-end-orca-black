import { getScoreboard } from "../api/dashboardApi";
import { useSuspenseQuery } from "@tanstack/react-query";

import { sortDescBy } from "../utils/sortDescBy";
import { dashboardKeys, REFETCH_INTERVAL } from "./dashboardKeys";

const sortByTotal = sortDescBy("total");

export function useScoreboard(period) {
  const { data } = useSuspenseQuery({
    queryKey: dashboardKeys.scoreboard(period),
    queryFn: () => getScoreboard(period),
    select: sortByTotal,
    refetchInterval: REFETCH_INTERVAL,
  });

  return { teams: data };
}
