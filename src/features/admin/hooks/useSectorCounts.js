import { useSuspenseQuery } from "@tanstack/react-query";

import { countBySector } from "../utils/sectorCounts";
import { adminSalesQuery } from "./adminQueries";

const selectSectorCounts = ({ sales }) => countBySector(sales);

export function useSectorCounts() {
  const { data } = useSuspenseQuery({ ...adminSalesQuery(""), select: selectSectorCounts });

  return { counts: data };
}
