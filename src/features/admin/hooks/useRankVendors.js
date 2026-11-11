import { getRankVendors } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

import { campaignKey, useSelectedCampaign } from "../../campaigns/utils/campaignSelection";

export function useRankVendors(type, { period = "all", segment = "" } = {}) {
  const campaign = useSelectedCampaign();
  const isDefault = period === "all" && !segment && !campaign;

  const { data } = useSuspenseQuery({
    queryKey: ["admin-rank", campaignKey(campaign), type, period, segment || "all"],
    queryFn: () => (isDefault ? getRankVendors(type) : getRankVendors(type, { period, segment, campaign })),
  });

  return { rank: data };
}
