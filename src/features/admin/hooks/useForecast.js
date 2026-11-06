import { useSuspenseQuery } from "@tanstack/react-query";

import { getForecast } from "../api/forecastApi";

export function useForecast(segment = "") {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-forecast", segment || "all"],
    queryFn: () => getForecast(segment),
  });

  return { forecast: data };
}
