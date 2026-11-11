import styles from "./AdminPanel.module.css";

import { Suspense, useMemo, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import usePermissions from "../../auth/hooks/usePermissions";
import GoalWidget from "../components/GoalWidget/GoalWidget";
import PageHeader from "../components/PageHeader/PageHeader";
import { PeoplePointsWidget } from "../components/PeoplePoints/PeoplePoints";
import RankWidget from "../components/RankWidget/RankWidget";
import SaleWidget from "../components/SaleWidget/SaleWidget";
import SalesFilters from "../components/SalesFilters/SalesFilters";
import SdrRankWidget from "../components/SdrRankWidget/SdrRankWidget";
import WeekGoalWidget from "../components/WeekGoalWidget/WeekGoalWidget";
import VendorProfile from "../components/VendorProfile/VendorProfile";
import WidgetFallback from "../components/WidgetFallback/WidgetFallback";
import { ALL_PERIODS, resolvePeriod } from "../utils/periods";

export default function AdminPanel() {
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [periodSelection, setPeriodSelection] = useState(ALL_PERIODS);
  // b2b e b2g abrem (e ficam) no próprio setor
  const { segment: userSegment } = usePermissions();
  const [selectedSegment, setSelectedSegment] = useState(userSegment);

  const period = useMemo(() => resolvePeriod(periodSelection), [periodSelection]);
  const [profileVendor, setProfileVendor] = useState(null);

  return (
    <div className={styles.page}>
      <PageHeader title="Dashboard" description="Vendas e rankings da campanha">
        <SalesFilters
          selectedVendorId={selectedVendorId}
          onVendorChange={setSelectedVendorId}
          periodSelection={periodSelection}
          onPeriodChange={setPeriodSelection}
          period={period}
          selectedSegment={selectedSegment}
          onSegmentChange={setSelectedSegment}
        />
      </PageHeader>
      <div className={styles.grid}>
        <div className={styles.full}>
          <ErrorBoundary location="Admin › meta">
            <Suspense fallback={<WidgetFallback title="Meta da campanha" />}>
              <GoalWidget segment={selectedSegment} />
            </Suspense>
          </ErrorBoundary>
        </div>
        <div className={styles.full}>
          <ErrorBoundary location="Admin › meta da semana">
            <Suspense fallback={<WidgetFallback title="Meta da semana" />}>
              <WeekGoalWidget segment={selectedSegment} />
            </Suspense>
          </ErrorBoundary>
        </div>
        <div className={styles.salesArea}>
          <ErrorBoundary location="Admin › vendas cadastradas">
            <Suspense fallback={<WidgetFallback title="Vendas cadastradas" />}>
              <SaleWidget vendorId={selectedVendorId} period={period} segment={selectedSegment} />
            </Suspense>
          </ErrorBoundary>
        </div>
        <ErrorBoundary location="Admin › rank dos vendedores">
          <RankWidget segment={selectedSegment} onSelectVendor={setProfileVendor} />
        </ErrorBoundary>
        <ErrorBoundary location="Admin › rank das passagens">
          <Suspense fallback={<WidgetFallback title="Rank das passagens" />}>
            <SdrRankWidget segment={selectedSegment} />
          </Suspense>
        </ErrorBoundary>
        <div className={styles.full}>
          <ErrorBoundary location="Admin › pontos por pessoa">
            <PeoplePointsWidget segment={selectedSegment} />
          </ErrorBoundary>
        </div>
      </div>
      {profileVendor && (
        <VendorProfile vendor={profileVendor} segment={selectedSegment} onClose={() => setProfileVendor(null)} />
      )}
    </div>
  );
}
