import { getGoal } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

import { campaignKey, useSelectedCampaign } from "../../campaigns/utils/campaignSelection";

export function useGoal() {
  const campaignId = useSelectedCampaign();
  const { data } = useSuspenseQuery({
    queryKey: ["admin-goal", campaignKey(campaignId)],
    queryFn: () => getGoal(campaignId),
  });

  return { goal: data };
}
