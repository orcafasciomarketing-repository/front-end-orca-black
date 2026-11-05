import styles from "./AdminPanel.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import GoalWidget from "../components/GoalWidget/GoalWidget";
import PageHeader from "../components/PageHeader/PageHeader";
import RankWidget from "../components/RankWidget/RankWidget";
import SaleWidget from "../components/SaleWidget/SaleWidget";
import SalesFilters from "../components/SalesFilters/SalesFilters";
import SdrRankWidget from "../components/SdrRankWidget/SdrRankWidget";
import WidgetFallback from "../components/WidgetFallback/WidgetFallback";

export default function AdminPanel() {
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [selectedSegment, setSelectedSegment] = useState("");

  return (
    <div className={styles.page}>
      <PageHeader title="Dashboard" description="Vendas e rankings da Black Friday">
        <SalesFilters
          selectedVendorId={selectedVendorId}
          onVendorChange={setSelectedVendorId}
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
          selectedSegment={selectedSegment}
          onSegmentChange={setSelectedSegment}
        />
      </PageHeader>
      <div className={styles.grid}>
        <div className={styles.full}>
          <ErrorBoundary location="Admin › meta">
            <Suspense fallback={<WidgetFallback title="Meta da Black Friday" />}>
              <GoalWidget segment={selectedSegment} />
            </Suspense>
          </ErrorBoundary>
        </div>
        <div className={styles.salesArea}>
          <ErrorBoundary location="Admin › vendas cadastradas">
            <Suspense fallback={<WidgetFallback title="Vendas cadastradas" />}>
              <SaleWidget vendorId={selectedVendorId} weekKey={selectedWeek} segment={selectedSegment} />
            </Suspense>
          </ErrorBoundary>
        </div>
        <ErrorBoundary location="Admin › rank dos vendedores">
          <RankWidget segment={selectedSegment} />
        </ErrorBoundary>
        <ErrorBoundary location="Admin › rank das passagens">
          <Suspense fallback={<WidgetFallback title="Rank das passagens" />}>
            <SdrRankWidget segment={selectedSegment} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
