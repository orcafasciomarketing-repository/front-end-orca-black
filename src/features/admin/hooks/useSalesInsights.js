import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { buildSalesInsights } from "../utils/salesInsights";
import { filterSalesBySegment } from "../utils/segments";
import { adminSalesQuery } from "./adminQueries";

export function useSalesInsights(period = null, segment = "") {
  const selectInsights = useCallback(
    ({ sales }) => buildSalesInsights(filterSalesBySegment(sales, segment), period),
    [period, segment],
  );

  const { data } = useSuspenseQuery({ ...adminSalesQuery(""), select: selectInsights });

  return data;
}
