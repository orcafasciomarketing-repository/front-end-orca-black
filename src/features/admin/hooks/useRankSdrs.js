import { getRankSdrs } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useRankSdrs({ period = "all", segment = "" } = {}) {
  const isDefault = period === "all" && !segment;

  const { data } = useSuspenseQuery({
    queryKey: ["admin-rank-sdr", period, segment || "all"],
    queryFn: () => (isDefault ? getRankSdrs() : getRankSdrs({ period, segment })),
  });

  return { rank: data };
}
