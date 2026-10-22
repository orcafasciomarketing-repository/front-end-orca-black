import { useCallback, useRef, useState } from "react";

export function useSaleQueue() {
  const [queue, setQueue] = useState([]);
  const nextKey = useRef(0);

  const enqueueSale = useCallback((sale) => {
    nextKey.current += 1;
    const key = nextKey.current;

    setQueue((items) => [...items, { key, sale }]);
  }, []);

  const dequeueSale = useCallback(() => {
    setQueue((items) => items.slice(1));
  }, []);

  return { currentItem: queue[0] ?? null, enqueueSale, dequeueSale };
}
