import { useSuspenseQuery } from "@tanstack/react-query";

import { getPeoplePoints } from "../api/pointsApi";

export function usePeoplePoints({ period = "all", segment = "", from = "", to = "" } = {}) {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-people-points", period, segment || "all", from, to],
    queryFn: () => getPeoplePoints({ period, segment, from, to }),
  });

  return { points: data };
}
