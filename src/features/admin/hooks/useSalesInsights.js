import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { buildSalesInsights } from "../utils/salesInsights";
import { adminSalesQuery } from "./adminQueries";

export function useSalesInsights(weekKey) {
  const selectInsights = useCallback(({ sales }) => buildSalesInsights(sales, weekKey), [weekKey]);

  const { data } = useSuspenseQuery({
    ...adminSalesQuery(""),
    select: selectInsights,
  });

  return data;
}
