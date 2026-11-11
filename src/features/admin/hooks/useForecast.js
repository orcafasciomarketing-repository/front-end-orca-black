import { useSuspenseQuery } from "@tanstack/react-query";

import { getForecast } from "../api/forecastApi";
import { campaignKey, useSelectedCampaign } from "../../campaigns/utils/campaignSelection";

export function useForecast(segment = "", month = null) {
  const selected = useSelectedCampaign();
  const campaign = month ? "" : selected;
  const { data } = useSuspenseQuery({
    queryKey: ["admin-forecast", segment || "all", month || `campaign-${campaignKey(campaign)}`],
    queryFn: () => getForecast(segment, month, campaign),
  });

  return { forecast: data };
}
