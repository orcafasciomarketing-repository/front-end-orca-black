import styles from "./PrizesPage.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import usePermissions from "../../auth/hooks/usePermissions";
import PageHeader from "../components/PageHeader/PageHeader";
import { PrizeBalances, PrizeHistory } from "../components/PrizesWidgets/PrizesWidgets";
import WidgetFallback from "../components/WidgetFallback/WidgetFallback";
import { getSegmentOptions } from "../utils/segments";

const WIDGETS = [
  { title: "Saldo de prêmios", Widget: PrizeBalances },
  { title: "Retiradas registradas", Widget: PrizeHistory },
];

export default function PrizesPage() {
  // b2b e b2g abrem (e ficam) no próprio setor
  const { segment: userSegment, isMaster } = usePermissions();
  const [selectedSegment, setSelectedSegment] = useState(userSegment);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Prêmios"
        description={isMaster ? "Saldo de prêmios de cada pessoa e registro das retiradas" : "Saldo de prêmios de cada pessoa"}
      >
        <label className={styles.field}>
          <span className={styles.label}>Setor</span>
          <select
            className={styles.select}
            aria-label="Filtrar prêmios por setor"
            value={selectedSegment}
            disabled={!!userSegment}
            onChange={(event) => setSelectedSegment(event.target.value)}
          >
            {getSegmentOptions(userSegment).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </PageHeader>
      {WIDGETS.map(({ title, Widget }) => (
        <ErrorBoundary key={title} location={`Admin › prêmios › ${title.toLowerCase()}`}>
          <Suspense fallback={<WidgetFallback title={title} />}>
            <Widget segment={selectedSegment} />
          </Suspense>
        </ErrorBoundary>
      ))}
    </div>
  );
}
