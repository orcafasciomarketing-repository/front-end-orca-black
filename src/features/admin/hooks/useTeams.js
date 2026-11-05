import { getTeams } from "../api/slidesApi";
import { useSuspenseQuery } from "@tanstack/react-query";

export function useTeams() {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-teams"],
    queryFn: getTeams,
  });

  return { teams: data };
}
