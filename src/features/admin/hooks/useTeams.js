import { getTeams } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

import { campaignKey, useSelectedCampaign } from "../../campaigns/utils/campaignSelection";

export function useTeams() {
  const campaignId = useSelectedCampaign();
  const { data } = useSuspenseQuery({
    queryKey: ["admin-teams", campaignKey(campaignId)],
    queryFn: () => getTeams(campaignId),
  });

  return { teams: data };
}
