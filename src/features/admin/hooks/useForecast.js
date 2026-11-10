import { useSuspenseQuery } from "@tanstack/react-query";

import { getForecast } from "../api/forecastApi";

export function useForecast(segment = "", month = null) {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-forecast", segment || "all", month || "campaign"],
    queryFn: () => getForecast(segment, month),
  });

  return { forecast: data };
}
