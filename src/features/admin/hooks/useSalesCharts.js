import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { buildSalesCharts } from "../utils/chartData";
import { adminSalesQuery } from "./adminQueries";

export function useSalesCharts(weekKey) {
  const selectCharts = useCallback(({ sales }) => buildSalesCharts(sales, weekKey), [weekKey]);

  const { data } = useSuspenseQuery({ ...adminSalesQuery(""), select: selectCharts });

  return data;
}
