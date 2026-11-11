import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { reportError } from "../../../shared/errorLogger";
import { createCampaign, deleteCampaign, getCampaigns, updateCampaign } from "../api/campaignsApi";
import { getSelectedCampaign, setSelectedCampaign } from "../utils/campaignSelection";

export const CAMPAIGNS_KEY = ["admin-campaigns"];

const campaignsQuery = { queryKey: CAMPAIGNS_KEY, queryFn: getCampaigns };

const reportUnexpected = (location) => (error) => {
  if (!error.response || error.response.status >= 500) reportError(error, { location });
};

export function useCampaigns() {
  const { data } = useSuspenseQuery(campaignsQuery);

  return { campaigns: data };
}

export function useCampaignOptions() {
  const { data } = useQuery(campaignsQuery);

  return { campaigns: data ?? null };
}

export function useCampaignMutations() {
  const queryClient = useQueryClient();
  const refreshAll = () =>
    queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0] ?? "").startsWith("admin-") });

  const create = useMutation({
    mutationFn: (campaign) => createCampaign(campaign),
    onSuccess: refreshAll,
    onError: reportUnexpected("Admin › cadastro de campanha"),
  });

  const update = useMutation({
    mutationFn: ({ id, campaign }) => updateCampaign(id, campaign),
    onSuccess: refreshAll,
    onError: reportUnexpected("Admin › edição de campanha"),
  });

  const remove = useMutation({
    mutationFn: (id) => deleteCampaign(id),
    onSuccess: (_, id) => {
      if (getSelectedCampaign() === id) setSelectedCampaign("");
      return refreshAll();
    },
    onError: reportUnexpected("Admin › exclusão de campanha"),
  });

  return { create, update, remove };
}
