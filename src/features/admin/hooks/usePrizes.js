import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { reportError } from "../../../shared/errorLogger";
import {
  createPrizeWithdrawal,
  deletePrizeWithdrawal,
  getPrizes,
  getPrizeWithdrawals,
} from "../api/prizesApi";
import { campaignKey, getSelectedCampaign, useSelectedCampaign } from "../../campaigns/utils/campaignSelection";

const PRIZES_KEY = ["admin-prizes"];

// Saldo acima do permitido, prêmio vazio etc. (4xx) não vai para os logs de erro
const reportUnexpected = (location) => (error) => {
  if (!error.response || error.response.status >= 500) reportError(error, { location });
};

export function usePrizes(segment = "") {
  const campaign = useSelectedCampaign();
  const { data } = useSuspenseQuery({
    queryKey: [...PRIZES_KEY, "summary", campaignKey(campaign), segment],
    queryFn: () => getPrizes(segment, campaign),
  });

  return { prizes: data };
}

export function usePrizeWithdrawals(segment = "") {
  const campaign = useSelectedCampaign();
  const { data } = useSuspenseQuery({
    queryKey: [...PRIZES_KEY, "withdrawals", campaignKey(campaign), segment],
    queryFn: () => getPrizeWithdrawals(segment, campaign),
  });

  return { withdrawals: data };
}

// Registrar ou excluir muda o saldo e o histórico: recarrega os dois
export function usePrizeMutations() {
  const queryClient = useQueryClient();
  const refreshPrizes = () => queryClient.invalidateQueries({ queryKey: PRIZES_KEY });

  const create = useMutation({
    mutationFn: (withdrawal) => createPrizeWithdrawal(withdrawal, getSelectedCampaign()),
    onSuccess: refreshPrizes,
    onError: reportUnexpected("Admin › registro de prêmio"),
  });

  const remove = useMutation({
    mutationFn: (id) => deletePrizeWithdrawal(id),
    onSuccess: refreshPrizes,
    onError: reportUnexpected("Admin › exclusão de prêmio"),
  });

  return { create, remove };
}
