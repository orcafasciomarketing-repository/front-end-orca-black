import styles from "./AdminPanel.module.css";

import { Suspense } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import Header from "../components/Header/Header";
import SaleWidget from "../components/SaleWidget/SaleWidget";
import RankWidget from "../components/RankWidget/RankWidget";
import ErrorLogWidget from "../components/ErrorLogWidget/ErrorLogWidget";
import TestReportWidget from "../components/TestReportWidget/TestReportWidget";

export default function AdminPanel() {
  return (
    <section className={`container ${styles.dashboard}`}>
      <Header />
      <div className={styles.grid_table_one}>
        <ErrorBoundary location="Admin › vendas cadastradas">
          <Suspense fallback={<p>Carregando dados...</p>}>
            <SaleWidget />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary location="Admin › rank dos vendedores">
          <Suspense fallback={<p>Carregando dados...</p>}>
            <RankWidget />
          </Suspense>
        </ErrorBoundary>
      </div>
      <div className={styles.grid_table_two}>
        <ErrorBoundary location="Admin › logs de erro">
          <Suspense fallback={<p>Carregando logs...</p>}>
            <ErrorLogWidget />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary location="Admin › logs de teste">
          <Suspense fallback={<p>Carregando relatório...</p>}>
            <TestReportWidget />
          </Suspense>
        </ErrorBoundary>
      </div>
    </section>
  );
}
