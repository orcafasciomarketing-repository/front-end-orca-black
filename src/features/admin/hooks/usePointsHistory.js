import { useSuspenseQuery } from "@tanstack/react-query";

import { getPointsHistory } from "../api/pointsApi";
import { campaignKey, useSelectedCampaign } from "../../campaigns/utils/campaignSelection";

export function usePointsHistory(segment = "") {
  const campaign = useSelectedCampaign();
  const { data } = useSuspenseQuery({
    queryKey: ["admin-points-history", campaignKey(campaign), segment || "all"],
    queryFn: () => getPointsHistory(segment, campaign),
  });

  return { history: data };
}
