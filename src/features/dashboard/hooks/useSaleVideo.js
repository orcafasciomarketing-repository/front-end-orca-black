import { useQuery } from "@tanstack/react-query";

import { checkSaleVideo } from "../api/dashboardApi";
import { dashboardKeys } from "./dashboardKeys";

export function useSaleVideo() {
  const { data } = useQuery({
    queryKey: dashboardKeys.saleVideo,
    queryFn: checkSaleVideo,
    staleTime: Infinity,
    retry: false,
  });

  return { videoUrl: data ?? null };
}
