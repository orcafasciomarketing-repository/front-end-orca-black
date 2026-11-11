import { useSuspenseQuery } from "@tanstack/react-query";

import { getPeoplePoints } from "../api/pointsApi";
import { campaignKey, useSelectedCampaign } from "../../campaigns/utils/campaignSelection";

export function usePeoplePoints({ period = "all", segment = "", from = "", to = "" } = {}) {
  const campaign = useSelectedCampaign();
  const { data } = useSuspenseQuery({
    queryKey: ["admin-people-points", campaignKey(campaign), period, segment || "all", from, to],
    queryFn: () => getPeoplePoints({ period, segment, from, to, campaign }),
  });

  return { points: data };
}
