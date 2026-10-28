import { getRankSdrs } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useRankSdrs() {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-rank-sdr"],
    queryFn: getRankSdrs,
  });

  return { rank: data };
}
