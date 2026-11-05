import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { filterSalesBySegment } from "../utils/segments";
import { filterSalesByWeek } from "../utils/weeks";
import { adminSalesQuery } from "./adminQueries";

export function useAdminSales(vendorId, weekKey, segment = "") {
  const selectSales = useCallback(
    ({ sales }) => filterSalesBySegment(filterSalesByWeek(sales, weekKey), segment),
    [weekKey, segment],
  );

  const { data: sales } = useSuspenseQuery({ ...adminSalesQuery(vendorId), select: selectSales });

  return { sales, total: sales.length };
}
