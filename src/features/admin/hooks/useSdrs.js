import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { reportError } from "../../../shared/errorLogger";
import { getSdrs } from "../api/slidesApi";

const byName = (sdrs) => [...sdrs].sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"));

export function useSdrs() {
  const { data, error } = useQuery({ queryKey: ["sdrs"], queryFn: () => getSdrs(), select: byName });

  useEffect(() => {
    if (error) {
      reportError(error, { location: "Admin › lista de pessoas de passagem" });
    }
  }, [error]);

  return { sdrs: data ?? [] };
}
