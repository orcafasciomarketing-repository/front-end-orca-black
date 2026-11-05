import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { buildComparison } from "../utils/comparison";
import { todayKey } from "../utils/periods";
import { filterSalesBySegment } from "../utils/segments";
import { adminSalesQuery } from "./adminQueries";

export function useSalesComparison(a, b, segment = "") {
  const selectComparison = useCallback(
    ({ sales }) => buildComparison(filterSalesBySegment(sales, segment), a, b, todayKey()),
    [a, b, segment],
  );

  const { data } = useSuspenseQuery({ ...adminSalesQuery(""), select: selectComparison });

  return data;
}
