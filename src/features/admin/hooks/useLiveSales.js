import { useContext, useEffect, useRef } from "react";
import { QueryClientContext } from "@tanstack/react-query";

import { subscribeToSalesEvents } from "../../dashboard/api/dashboardApi";
import { isMockEnabled } from "../../../shared/utils/isMockEnabled";

const PROFILE_KEY = "admin-me";

const isSaleDependent = (query) => {
  const key = String(query.queryKey[0] ?? "");
  return key.startsWith("admin-") && key !== PROFILE_KEY;
};

const canListen = () => isMockEnabled() || typeof window.EventSource !== "undefined";

export function useLiveSales(onNewSale, { spreadMs = 0 } = {}) {
  const queryClient = useContext(QueryClientContext);
  const onNewSaleRef = useRef(onNewSale);

  useEffect(() => {
    onNewSaleRef.current = onNewSale;
  }, [onNewSale]);

  useEffect(() => {
    if (!queryClient || !canListen()) {
      return undefined;
    }

    const timers = new Set();
    const refresh = () => queryClient.invalidateQueries({ predicate: isSaleDependent });

    const unsubscribe = subscribeToSalesEvents((newSale) => {
      if (spreadMs > 0) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          refresh();
        }, Math.random() * spreadMs);
        timers.add(timer);
      } else {
        refresh();
      }

      if (newSale) {
        onNewSaleRef.current?.(newSale);
      }
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      unsubscribe();
    };
  }, [queryClient, spreadMs]);
}
