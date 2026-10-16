import styles from "./SaleWidget.module.css";
import { useAdminSales } from "../../hooks/useAdminSales";

export default function SaleWidget() {
  const adminSales = useAdminSales();

  console.log(adminSales.sales);
  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Vendas cadastradas</h2>
        <span className={styles.count}>{adminSales.sales.total}</span>
      </header>
      <ul className={styles.list}>
        <li className={styles.item}>
          <div className={styles.itemTop}>
            <strong className={styles.saleName}></strong>
            <span
              className={`${styles.status} ${"ativa" ? styles.active : styles.canceled}`}
            ></span>
            <span className={styles.value}></span>
            <dl className={styles.details}>
              <div>
                <dt>Vendedor</dt>
              </div>
              <div>
                <dt>Passagem</dt>
              </div>
              <div>
                <dt>Data da venda</dt>
              </div>
            </dl>
          </div>
        </li>
      </ul>
    </section>
  );
}
