import { getRankVendors } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useRankVendors(type, { period = "all", segment = "" } = {}) {
  const isDefault = period === "all" && !segment;

  const { data } = useSuspenseQuery({
    queryKey: ["admin-rank", type, period, segment || "all"],
    queryFn: () => (isDefault ? getRankVendors(type) : getRankVendors(type, { period, segment })),
  });

  return { rank: data };
}
