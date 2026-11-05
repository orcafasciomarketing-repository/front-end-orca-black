import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { rankSdrsFromSales, rankVendorsFromSales } from "../utils/segmentRanking";
import { filterSalesBySegment } from "../utils/segments";
import { adminSalesQuery } from "./adminQueries";

export function useSegmentRankVendors(type, segment) {
  const selectRank = useCallback(
    ({ sales }) => rankVendorsFromSales(filterSalesBySegment(sales, segment), type),
    [type, segment],
  );

  const { data } = useSuspenseQuery({ ...adminSalesQuery(""), select: selectRank });

  return { rank: data };
}

export function useSegmentRankSdrs(segment) {
  const selectRank = useCallback(({ sales }) => rankSdrsFromSales(filterSalesBySegment(sales, segment)), [segment]);

  const { data } = useSuspenseQuery({ ...adminSalesQuery(""), select: selectRank });

  return { rank: data };
}
