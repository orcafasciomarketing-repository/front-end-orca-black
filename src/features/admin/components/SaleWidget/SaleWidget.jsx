import styles from "./SaleWidget.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useAdminSales } from "../../hooks/useAdminSales";
import { formatDateTime } from "../../utils/formatDateTime";
import { formatPassageNames, getPassagePeople } from "../../utils/passages";

const STATUS_LABELS = {
  ativa: "Ativa",
  cancelada: "Cancelada",
};

export default function SaleWidget({ vendorId, weekKey }) {
  const { sales, total } = useAdminSales(vendorId, weekKey);

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Vendas cadastradas</h2>
        <span className={styles.count}>{total}</span>
      </header>
      {sales.length === 0 ? (
        <p className={styles.empty}>Nenhuma venda encontrada</p>
      ) : (
        <ul className={styles.list}>
          {sales.map((sale) => (
            <li key={sale._id} className={styles.item}>
              <div className={styles.itemTop}>
                <strong className={styles.saleName}>{sale.rdDealName}</strong>
                <span
                  className={`${styles.status} ${sale.dealStatus === "ativa" ? styles.active : styles.canceled}`}
                >
                  {STATUS_LABELS[sale.dealStatus] ?? sale.dealStatus}
                </span>
                <span className={styles.value}>{formatCurrency(sale.value)}</span>
              </div>
              <dl className={styles.details}>
                <div>
                  <dt>Vendedor</dt>
                  <dd>{sale.vendorId?.vendorName ?? "—"}</dd>
                </div>
                <div>
                  <dt>{getPassagePeople(sale).length > 1 ? "Passagens" : "Passagem"}</dt>
                  <dd>{formatPassageNames(sale) || "—"}</dd>
                </div>
                <div>
                  <dt>Data da venda</dt>
                  <dd>{sale.realizedAt ? formatDateTime(sale.realizedAt) : "—"}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
