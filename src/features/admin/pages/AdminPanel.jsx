import styles from "./AdminPanel.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import PageHeader from "../components/PageHeader/PageHeader";
import RankWidget from "../components/RankWidget/RankWidget";
import SaleWidget from "../components/SaleWidget/SaleWidget";
import SalesFilters from "../components/SalesFilters/SalesFilters";
import SdrRankWidget from "../components/SdrRankWidget/SdrRankWidget";
import WidgetFallback from "../components/WidgetFallback/WidgetFallback";

export default function AdminPanel() {
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");

  return (
    <div className={styles.page}>
      <PageHeader title="Dashboard" description="Vendas e rankings da Black Friday">
        <SalesFilters
          selectedVendorId={selectedVendorId}
          onVendorChange={setSelectedVendorId}
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
        />
      </PageHeader>
      <div className={styles.grid}>
        <div className={styles.salesArea}>
          <ErrorBoundary location="Admin › vendas cadastradas">
            <Suspense fallback={<WidgetFallback title="Vendas cadastradas" />}>
              <SaleWidget vendorId={selectedVendorId} weekKey={selectedWeek} />
            </Suspense>
          </ErrorBoundary>
        </div>
        <ErrorBoundary location="Admin › rank dos vendedores">
          <RankWidget />
        </ErrorBoundary>
        <ErrorBoundary location="Admin › rank das passagens">
          <Suspense fallback={<WidgetFallback title="Rank das passagens" />}>
            <SdrRankWidget />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
