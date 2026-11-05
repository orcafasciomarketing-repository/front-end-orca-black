import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { filterSalesBySegment } from "../utils/segments";
import { countBySector } from "../utils/sectorCounts";
import { adminSalesQuery } from "./adminQueries";

export function useSectorCounts(segment = "") {
  const selectSectorCounts = useCallback(({ sales }) => countBySector(filterSalesBySegment(sales, segment)), [segment]);

  const { data } = useSuspenseQuery({ ...adminSalesQuery(""), select: selectSectorCounts });

  return { counts: data };
}
