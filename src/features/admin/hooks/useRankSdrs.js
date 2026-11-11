import { getRankSdrs } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

import { campaignKey, useSelectedCampaign } from "../../campaigns/utils/campaignSelection";

export function useRankSdrs({ period = "all", segment = "" } = {}) {
  const campaign = useSelectedCampaign();
  const isDefault = period === "all" && !segment && !campaign;

  const { data } = useSuspenseQuery({
    queryKey: ["admin-rank-sdr", campaignKey(campaign), period, segment || "all"],
    queryFn: () => (isDefault ? getRankSdrs() : getRankSdrs({ period, segment, campaign })),
  });

  return { rank: data };
}
