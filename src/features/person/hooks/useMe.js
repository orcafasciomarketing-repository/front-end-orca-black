import { useSuspenseQuery } from "@tanstack/react-query";

import { getMe, getMyPrizes, getMySales, getMyTeam } from "../api/meApi";

const byNewestSale = (a, b) => new Date(b.realizedAt ?? 0) - new Date(a.realizedAt ?? 0);

export function useMe() {
  const { data } = useSuspenseQuery({ queryKey: ["admin-me"], queryFn: getMe });

  return { me: data };
}

export function useMySales() {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-me-sales"],
    queryFn: getMySales,
    select: (result) => ({ sales: [...result.data].sort(byNewestSale), total: result.total }),
  });

  return data;
}

export function useMyTeam(period = "all") {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-me-team", period],
    queryFn: () => getMyTeam(period),
  });

  return { team: data };
}

export function useMyPrizes() {
  const { data } = useSuspenseQuery({ queryKey: ["admin-me-prizes"], queryFn: getMyPrizes });

  return { prizes: data };
}
