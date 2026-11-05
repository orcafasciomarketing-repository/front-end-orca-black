import { useEffect, useRef, useState } from "react";

export function useElementWidth(fallbackWidth) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallbackWidth);

  useEffect(() => {
    const element = ref.current;

    if (!element || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width];
}
