import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { filterSalesByWeek } from "../utils/weeks";
import { adminSalesQuery } from "./adminQueries";

export function useAdminSales(vendorId, weekKey) {
  const selectWeek = useCallback(({ sales }) => filterSalesByWeek(sales, weekKey), [weekKey]);

  const { data: sales } = useSuspenseQuery({ ...adminSalesQuery(vendorId), select: selectWeek });

  return { sales, total: sales.length };
}
