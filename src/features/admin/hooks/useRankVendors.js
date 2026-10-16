import { getRankVendors } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useRankVendors(type) {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-rank", type],
    queryFn: ({ signal }) => {
      return getRankVendors(type);
    },
  });

  return { rank: data.data };
}
