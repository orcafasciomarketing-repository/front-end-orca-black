import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { buildSalesInsights } from "../utils/salesInsights";
import { filterSalesBySegment } from "../utils/segments";
import { adminSalesQuery } from "./adminQueries";

export function useSalesInsights(weekKey, segment = "") {
  const selectInsights = useCallback(
    ({ sales }) => buildSalesInsights(filterSalesBySegment(sales, segment), weekKey),
    [weekKey, segment],
  );

  const { data } = useSuspenseQuery({ ...adminSalesQuery(""), select: selectInsights });

  return data;
}
