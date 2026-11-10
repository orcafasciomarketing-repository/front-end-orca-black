import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { reportError } from "../../../shared/errorLogger";
import { deleteGoalMonth, getGoalHistory, getGoalMonth, getGoalProgress, saveGoalMonth } from "../api/goalsApi";

const GOALS_KEY = ["admin-goals"];

const reportUnexpected = (location) => (error) => {
  if (!error.response || error.response.status >= 500) reportError(error, { location });
};

export function useGoalMonth(month) {
  const { data } = useSuspenseQuery({
    queryKey: [...GOALS_KEY, "month", month],
    queryFn: () => getGoalMonth(month),
  });

  return { goalMonth: data };
}

export function useGoalProgress(month) {
  const { data } = useSuspenseQuery({
    queryKey: [...GOALS_KEY, "progress", month],
    queryFn: () => getGoalProgress(month),
  });

  return { progress: data };
}

export function useGoalHistory(month) {
  const { data } = useSuspenseQuery({
    queryKey: [...GOALS_KEY, "history", month],
    queryFn: () => getGoalHistory(month),
  });

  return { history: data };
}

export function useGoalMutations() {
  const queryClient = useQueryClient();
  const refreshGoals = () => queryClient.invalidateQueries({ queryKey: GOALS_KEY });

  const save = useMutation({
    mutationFn: ({ month, segment, payload }) => saveGoalMonth(month, segment, payload),
    onSuccess: refreshGoals,
    onError: reportUnexpected("Admin › cadastro de metas"),
  });

  const remove = useMutation({
    mutationFn: ({ month, segment }) => deleteGoalMonth(month, segment),
    onSuccess: refreshGoals,
    onError: reportUnexpected("Admin › exclusão de metas"),
  });

  return { save, remove };
}
