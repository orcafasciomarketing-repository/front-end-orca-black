import { useSuspenseQuery } from "@tanstack/react-query";

import { getPointsHistory } from "../api/pointsApi";

export function usePointsHistory(segment = "") {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-points-history", segment || "all"],
    queryFn: () => getPointsHistory(segment),
  });

  return { history: data };
}
