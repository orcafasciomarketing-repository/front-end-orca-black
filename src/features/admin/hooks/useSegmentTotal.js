import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { isActiveSale } from "../utils/chartData";
import { filterSalesBySegment } from "../utils/segments";
import { adminSalesQuery } from "./adminQueries";

const sumActive = (sales) => sales.filter(isActiveSale).reduce((total, sale) => total + (sale.value ?? 0), 0);

export function useSegmentTotal(segment) {
  const selectTotals = useCallback(
    ({ sales }) => ({ total: sumActive(filterSalesBySegment(sales, segment)), allSegments: sumActive(sales) }),
    [segment],
  );

  const { data } = useSuspenseQuery({ ...adminSalesQuery(""), select: selectTotals });

  return data;
}
