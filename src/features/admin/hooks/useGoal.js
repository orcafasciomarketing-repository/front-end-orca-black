import { getGoal } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useGoal() {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-goal"],
    queryFn: getGoal,
  });

  return { goal: data };
}
