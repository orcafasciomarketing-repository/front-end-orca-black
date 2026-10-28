import { getRankVendors } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useRankVendors(type) {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-rank", type],
    queryFn: () => getRankVendors(type),
  });

  return { rank: data };
}
