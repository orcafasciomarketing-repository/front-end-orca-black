import styles from "./SaleToasts.module.css";

import { useCallback, useEffect, useRef, useState } from "react";

import { useLiveSales } from "../../hooks/useLiveSales";
import Avatar from "../Avatar/Avatar";

export const TOAST_DURATION_MS = 8000;
const MAX_TOASTS = 3;

export default function SaleToasts() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((key) => {
    clearTimeout(timers.current.get(key));
    timers.current.delete(key);
    setToasts((current) => current.filter((toast) => toast.key !== key));
  }, []);

  const addToast = useCallback(
    (sale) => {
      const key = `${sale.id}-${Date.now()}`;
      setToasts((current) => [{ key, sale }, ...current].slice(0, MAX_TOASTS));
      timers.current.set(
        key,
        setTimeout(() => dismiss(key), TOAST_DURATION_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  useLiveSales(addToast);

  return (
    <div className={styles.toasts} role="status" aria-live="polite">
      {toasts.map(({ key, sale }) => (
        <div key={key} className={styles.toast}>
          <Avatar name={sale.seller.name} imageUrl={sale.seller.imageUrl} />
          <div className={styles.content}>
            <strong className={styles.title}>{sale.type === "farm" ? "Nova renovação" : "Nova venda"}</strong>
            <span className={styles.text}>
              {sale.seller.name}
              {sale.seller.job && ` · ${sale.seller.job}`}
            </span>
            {sale.assists.length > 0 && (
              <span className={styles.assists}>Passagem: {sale.assists.map((person) => person.name).join(", ")}</span>
            )}
          </div>
          <button className={styles.close} type="button" aria-label="Fechar aviso" onClick={() => dismiss(key)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
