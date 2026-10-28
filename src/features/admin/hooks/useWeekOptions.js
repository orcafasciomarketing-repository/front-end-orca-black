import { useQuery } from "@tanstack/react-query";

import { listWeeks } from "../utils/weeks";
import { adminSalesQuery } from "./adminQueries";

const toWeekOptions = ({ sales }) => listWeeks(sales);

export function useWeekOptions() {
  const { data } = useQuery({ ...adminSalesQuery(), select: toWeekOptions });

  return { weeks: data ?? listWeeks([]) };
}
