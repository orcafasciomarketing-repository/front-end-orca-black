import styles from "./ChartsPage.module.css";

import { Suspense, useEffect, useState } from "react";

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
import PrintDialog from "../components/PrintDialog/PrintDialog";
import {
  FunnelSalesChart,
  GoalTrackChart,
  PassageChart,
  SegmentSalesChart,
  TeamSalesChart,
  TotalSalesChart,
  VendorSalesChart,
} from "../components/SalesChartWidgets/SalesChartWidgets";
import { DownloadIcon } from "../components/Icons/Icons";
import WidgetFallback from "../components/WidgetFallback/WidgetFallback";
import { useWeekOptions } from "../hooks/useWeekOptions";
import { SEGMENT_OPTIONS } from "../utils/segments";

const THEME_KEY = "admin-charts-theme";
const KPIS_TITLE = "Indicadores";

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

const PRINT_ITEMS = [KPIS_TITLE, ...CHARTS.map((chart) => chart.title)];

const printDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

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
  const [selectedSegment, setSelectedSegment] = useState("");
  const [isDark, setIsDark] = useState(readTheme);
  const [isChoosing, setIsChoosing] = useState(false);
  const [printItems, setPrintItems] = useState(null);
  const { weeks } = useWeekOptions();

  useEffect(() => {
    if (!printItems) {
      return undefined;
    }

    const finishPrinting = () => setPrintItems(null);
    window.addEventListener("afterprint", finishPrinting);
    window.print();

    return () => window.removeEventListener("afterprint", finishPrinting);
  }, [printItems]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    saveTheme(!isDark);
  };

  const startPrinting = (items) => {
    setIsChoosing(false);
    setPrintItems({ titles: new Set(items), generatedAt: new Date() });
  };

  const printClass = (title) => (printItems && !printItems.titles.has(title) ? styles.notPrinted : "");

  const weekLabel = weeks.find((week) => week.key === selectedWeek)?.label ?? "Todas as semanas";
  const segmentLabel = SEGMENT_OPTIONS.find((option) => option.value === selectedSegment)?.label;

  return (
    <div className={`${styles.page} ${isDark && !printItems ? styles.dark : ""}`}>
      {printItems && (
        <div className={styles.printHeader}>
          <p className={styles.printTitle}>Relatório de vendas · Black Friday</p>
          <p className={styles.printDetails}>
            Semana: {weekLabel} · Setor: {segmentLabel} · Gerado em {printDateFormatter.format(printItems.generatedAt)}
          </p>
        </div>
      )}
      <PageHeader title="Gráficos" description="Acompanhamento das vendas da Black Friday">
        <div className={styles.controls}>
          <button className={styles.actionButton} type="button" onClick={() => setIsChoosing(true)}>
            <DownloadIcon />
            Gerar PDF
          </button>
          <button className={styles.actionButton} type="button" aria-pressed={isDark} onClick={toggleTheme}>
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
          <label className={styles.field}>
            <span className={styles.label}>Setor</span>
            <select
              className={styles.select}
              aria-label="Filtrar gráficos por setor"
              value={selectedSegment}
              onChange={(event) => setSelectedSegment(event.target.value)}
            >
              {SEGMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PageHeader>
      <div className={printClass(KPIS_TITLE)}>
        <ErrorBoundary location="Admin › gráficos › indicadores">
          <Suspense fallback={<WidgetFallback title={KPIS_TITLE} />}>
            <SalesKpis weekKey={selectedWeek} segment={selectedSegment} />
          </Suspense>
        </ErrorBoundary>
      </div>
      <div className={styles.grid}>
        {CHARTS.map(({ title, Chart, className }) => (
          <div key={title} className={`${className ? styles[className] : ""} ${printClass(title)}`}>
            <ErrorBoundary location={`Admin › gráficos › ${title.toLowerCase()}`}>
              <Suspense fallback={<WidgetFallback title={title} />}>
                <Chart weekKey={selectedWeek} segment={selectedSegment} />
              </Suspense>
            </ErrorBoundary>
          </div>
        ))}
      </div>
      {isChoosing && <PrintDialog items={PRINT_ITEMS} onCancel={() => setIsChoosing(false)} onPrint={startPrinting} />}
    </div>
  );
}
