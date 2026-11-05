import styles from "./ChartsPage.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import {
  CancellationChart,
  ConcentrationChart,
  ForecastCard,
  HeatmapChart,
  SalesKpis,
  SegmentShareChart,
  TicketChart,
  WeeklySalesChart,
} from "../components/InsightWidgets/InsightWidgets";
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

const THEME_KEY = "admin-charts-theme";

const CHARTS = [
  { title: "Acumulado x meta", Chart: GoalTrackChart },
  { title: "Previsão de fechamento", Chart: ForecastCard },
  { title: "Vendas acumuladas", Chart: TotalSalesChart },
  { title: "Vendas acumuladas por setor", Chart: SegmentSalesChart },
  { title: "Vendas x renovações por dia", Chart: FunnelSalesChart },
  { title: "Vendas por semana", Chart: WeeklySalesChart },
  { title: "Vendas por pessoa", Chart: VendorSalesChart, className: "tall" },
  { title: "Vendas por equipe", Chart: TeamSalesChart },
  { title: "Passagens por pessoa", Chart: PassageChart },
  { title: "Ticket médio", Chart: TicketChart, className: "tall" },
  { title: "Participação por setor", Chart: SegmentShareChart },
  { title: "Concentração", Chart: ConcentrationChart },
  { title: "Cancelamentos", Chart: CancellationChart },
  { title: "Quando as vendas fecham", Chart: HeatmapChart },
];

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark";
  } catch {
    return false;
  }
}

function saveTheme(isDark) {
  try {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  } catch {
    return;
  }
}

export default function ChartsPage() {
  const [selectedWeek, setSelectedWeek] = useState("");
  const [isDark, setIsDark] = useState(readTheme);
  const { weeks } = useWeekOptions();

  const toggleTheme = () => {
    setIsDark(!isDark);
    saveTheme(!isDark);
  };

  return (
    <div className={`${styles.page} ${isDark ? styles.dark : ""}`}>
      <PageHeader title="Gráficos" description="Acompanhamento das vendas da Black Friday">
        <div className={styles.controls}>
          <button className={styles.themeButton} type="button" aria-pressed={isDark} onClick={toggleTheme}>
            <span aria-hidden="true">{isDark ? "☀" : "☾"}</span>
            Modo escuro
          </button>
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
        </div>
      </PageHeader>
      <ErrorBoundary location="Admin › gráficos › indicadores">
        <Suspense fallback={<WidgetFallback title="Indicadores" />}>
          <SalesKpis weekKey={selectedWeek} />
        </Suspense>
      </ErrorBoundary>
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
