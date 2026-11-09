import styles from "./SaleWidget.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useAdminSales } from "../../hooks/useAdminSales";
import { toCompanyUrl } from "../../utils/companyLink";
import { formatDateTime } from "../../utils/formatDateTime";
import { formatPassageNames, getPassagePeople } from "../../utils/passages";

const STATUS_LABELS = {
  ativa: "Concluída",
  cancelada: "Cancelada",
};

function SaleName({ name }) {
  const url = toCompanyUrl(name);

  if (!url) {
    return name;
  }

  return (
    <a className={styles.saleLink} href={url} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba">
      {name}{" "}
      <span className={styles.srOnly}>(abre em nova aba)</span>
    </a>
  );
}

export default function SaleWidget({ vendorId, period, segment }) {
  const { sales, total } = useAdminSales(vendorId, period, segment);

  return <SaleList sales={sales} total={total} />;
}

export function SaleList({ sales, total, title = "Vendas cadastradas" }) {
  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">{title}</h2>
        <span className={styles.count}>{total}</span>
      </header>
      {sales.length === 0 ? (
        <p className={styles.empty}>Nenhuma venda encontrada</p>
      ) : (
        <ul className={styles.list}>
          {sales.map((sale) => (
            <li key={sale._id} className={styles.item}>
              <div className={styles.itemTop}>
                <strong className={styles.saleName}>
                  <SaleName name={sale.rdDealName} />
                </strong>
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
