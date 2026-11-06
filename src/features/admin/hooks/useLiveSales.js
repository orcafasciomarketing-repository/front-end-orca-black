import { useContext, useEffect, useRef } from "react";
import { QueryClientContext } from "@tanstack/react-query";

import { subscribeToSalesEvents } from "../../dashboard/api/dashboardApi";
import { isMockEnabled } from "../../../shared/utils/isMockEnabled";

const isAdminQuery = (query) => String(query.queryKey[0] ?? "").startsWith("admin-");

const canListen = () => isMockEnabled() || typeof window.EventSource !== "undefined";

export function useLiveSales(onNewSale) {
  const queryClient = useContext(QueryClientContext);
  const onNewSaleRef = useRef(onNewSale);

  useEffect(() => {
    onNewSaleRef.current = onNewSale;
  }, [onNewSale]);

  useEffect(() => {
    if (!queryClient || !canListen()) {
      return undefined;
    }

    return subscribeToSalesEvents((newSale) => {
      queryClient.invalidateQueries({ predicate: isAdminQuery });

      if (newSale) {
        onNewSaleRef.current?.(newSale);
      }
    });
  }, [queryClient]);
}
