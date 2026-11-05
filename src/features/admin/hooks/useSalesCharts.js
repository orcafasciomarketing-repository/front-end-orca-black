import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { buildSalesCharts } from "../utils/chartData";
import { filterSalesBySegment } from "../utils/segments";
import { adminSalesQuery } from "./adminQueries";

export function useSalesCharts(period = null, segment = "") {
  const selectCharts = useCallback(
    ({ sales }) => buildSalesCharts(filterSalesBySegment(sales, segment), period),
    [period, segment],
  );

  const { data } = useSuspenseQuery({ ...adminSalesQuery(""), select: selectCharts });

  return data;
}
