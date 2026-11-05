import styles from "./ChartsPage.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import PageHeader from "../components/PageHeader/PageHeader";
import {
  FunnelSalesChart,
  GoalTrackChart,
  PassageChart,
  SegmentSalesChart,
  TeamSalesChart,
  TotalSalesChart,
  VendorSalesChart,
} from "../components/SalesChartWidgets/SalesChartWidgets";
import WidgetFallback from "../components/WidgetFallback/WidgetFallback";
import { useWeekOptions } from "../hooks/useWeekOptions";

const CHARTS = [
  { title: "Vendas acumuladas", Chart: TotalSalesChart },
  { title: "Vendas acumuladas por setor", Chart: SegmentSalesChart },
  { title: "Acumulado x meta", Chart: GoalTrackChart },
  { title: "Vendas x renovações por dia", Chart: FunnelSalesChart },
  { title: "Vendas por pessoa", Chart: VendorSalesChart, className: "tall" },
  { title: "Vendas por equipe", Chart: TeamSalesChart },
  { title: "Passagens por pessoa", Chart: PassageChart },
];

export default function ChartsPage() {
  const [selectedWeek, setSelectedWeek] = useState("");
  const { weeks } = useWeekOptions();

  return (
    <div className={styles.page}>
      <PageHeader title="Gráficos" description="Acompanhamento das vendas da Black Friday">
        <label className={styles.field}>
          <span className={styles.label}>Semana</span>
          <select
            className={styles.select}
            aria-label="Filtrar gráficos por semana"
            value={selectedWeek}
            onChange={(event) => setSelectedWeek(event.target.value)}
          >
            <option value="">Todas as semanas</option>
            {weeks.map((week) => (
              <option key={week.key} value={week.key}>
                {week.label}
              </option>
            ))}
          </select>
        </label>
      </PageHeader>
      <div className={styles.grid}>
        {CHARTS.map(({ title, Chart, className }) => (
          <div key={title} className={className ? styles[className] : undefined}>
            <ErrorBoundary location={`Admin › gráficos › ${title.toLowerCase()}`}>
              <Suspense fallback={<WidgetFallback title={title} />}>
                <Chart weekKey={selectedWeek} />
              </Suspense>
            </ErrorBoundary>
          </div>
        ))}
      </div>
    </div>
  );
}
