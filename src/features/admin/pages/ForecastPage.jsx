import styles from "./ForecastPage.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import usePermissions from "../../auth/hooks/usePermissions";
import {
  ForecastIndicators,
  ForecastPace,
  ForecastScenarios,
  ForecastTrajectoryChart,
  WeekForecast,
} from "../components/ForecastWidgets/ForecastWidgets";
import PageHeader from "../components/PageHeader/PageHeader";
import WidgetFallback from "../components/WidgetFallback/WidgetFallback";
import { getSegmentOptions } from "../utils/segments";
import { currentMonthKey } from "../../goals/utils/goalMath";

const WIDGETS = [
  { title: "Cenários da campanha", Widget: ForecastScenarios, className: "full" },
  { title: "Trajetórias do forecast", Widget: ForecastTrajectoryChart, className: "full" },
  { title: "Indicadores do forecast", Widget: ForecastIndicators, className: "full" },
  { title: "Como o ritmo é calculado", Widget: ForecastPace },
  { title: "Forecast da semana", Widget: WeekForecast },
];

export default function ForecastPage() {
  // b2b e b2g abrem (e ficam) no próprio setor
  const { segment: userSegment } = usePermissions();
  const [selectedSegment, setSelectedSegment] = useState(userSegment);
  const [period, setPeriod] = useState("campaign");
  const [month, setMonth] = useState(() => currentMonthKey());
  const selectedMonth = period === "month" ? month : null;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Previsão"
        description={
          selectedMonth
            ? "Forecast do mês: cenários pessimista, realista e otimista contra a Meta do cadastro de metas"
            : "Forecast da Black Friday: cenários pessimista, realista e otimista"
        }
      >
        <label className={styles.field}>
          <span className={styles.label}>Período</span>
          <select
            className={styles.select}
            aria-label="Período da previsão"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="campaign">Campanha Black</option>
            <option value="month">Mês</option>
          </select>
        </label>
        {selectedMonth && (
          <label className={styles.field}>
            <span className={styles.label}>Mês</span>
            <input
              className={styles.input}
              type="month"
              aria-label="Mês da previsão"
              value={month}
              onChange={(event) => /^\d{4}-\d{2}$/.test(event.target.value) && setMonth(event.target.value)}
            />
          </label>
        )}
        <label className={styles.field}>
          <span className={styles.label}>Setor</span>
          <select
            className={styles.select}
            aria-label="Filtrar previsão por setor"
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
      <div className={styles.grid}>
        {WIDGETS.map(({ title, Widget, className }) => (
          <div key={title} className={className ? styles[className] : ""}>
            <ErrorBoundary key={selectedMonth ?? "campaign"} location={`Admin › previsão › ${title.toLowerCase()}`}>
              <Suspense fallback={<WidgetFallback title={title} />}>
                <Widget segment={selectedSegment} month={selectedMonth} />
              </Suspense>
            </ErrorBoundary>
          </div>
        ))}
      </div>
    </div>
  );
}
