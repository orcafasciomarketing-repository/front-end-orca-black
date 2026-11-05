import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { filterSalesBySegment } from "../utils/segments";
import { filterSalesByPeriod } from "../utils/periods";
import { adminSalesQuery } from "./adminQueries";

export function useAdminSales(vendorId, period = null, segment = "") {
  const selectSales = useCallback(
    ({ sales }) => filterSalesBySegment(filterSalesByPeriod(sales, period), segment),
    [period, segment],
  );

  const { data: sales } = useSuspenseQuery({ ...adminSalesQuery(vendorId), select: selectSales });

  return { sales, total: sales.length };
}
