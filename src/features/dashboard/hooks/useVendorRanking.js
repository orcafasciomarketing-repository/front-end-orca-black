import { getVendorRanking } from "../api/dashboardApi";
import { useSuspenseQuery } from "@tanstack/react-query";

import { sortDescBy } from "../utils/sortDescBy";
import { dashboardKeys, REFETCH_INTERVAL } from "./dashboardKeys";

const sortByPoints = sortDescBy("points");

export function useVendorRanking(period, department) {
  const { data } = useSuspenseQuery({
    queryKey: dashboardKeys.vendorRanking(period, department),
    queryFn: () => getVendorRanking(period, department),
    select: sortByPoints,
    refetchInterval: REFETCH_INTERVAL,
  });

  return { vendors: data };
}
