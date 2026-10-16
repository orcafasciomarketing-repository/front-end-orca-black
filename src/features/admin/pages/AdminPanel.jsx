import styles from "./AdminPanel.module.css";

import { Suspense } from "react";

import Header from "../components/Header/Header";
import SaleWidget from "../components/SaleWidget/SaleWidget";
import RankWidget from "../components/RankWidget/RankWidget";
export default function AdminPanel() {
  return (
    <section className={`container ${styles.dashboard}`}>
      <Header />
      <div className={styles.grid_table_one}>
        <Suspense fallback={<p>Carregando dados...</p>}>
          <SaleWidget />
        </Suspense>
        <Suspense fallback={<p>Carregando dados...</p>}>
          <RankWidget />
        </Suspense>
      </div>
    </section>
  );
}
