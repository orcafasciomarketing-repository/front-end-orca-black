import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { subscribeToSalesEvents } from "../api/dashboardApi";
import { dashboardKeys } from "./dashboardKeys";

export function useSalesEvents(onNewSale) {
  const queryClient = useQueryClient();
  const onNewSaleRef = useRef(onNewSale);

  useEffect(() => {
    onNewSaleRef.current = onNewSale;
  }, [onNewSale]);

  useEffect(() => {
    const unsubscribe = subscribeToSalesEvents((newSale) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.scoreboards });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.rankings });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.goal });

      if (newSale) {
        onNewSaleRef.current?.(newSale);
      }
    });

    return unsubscribe;
  }, [queryClient]);
}
