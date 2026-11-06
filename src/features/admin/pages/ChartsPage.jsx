import styles from "./ChartsPage.module.css";

import { Suspense, useEffect, useMemo, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import usePermissions from "../../auth/hooks/usePermissions";
import {
  CancellationChart,
  ConcentrationChart,
  ForecastCard,
  SalesCalendarChart,
  SalesKpis,
  SegmentShareChart,
  TicketChart,
  WeeklySalesChart,
} from "../components/InsightWidgets/InsightWidgets";
import { ForecastSummary } from "../components/ForecastWidgets/ForecastWidgets";
import PageHeader from "../components/PageHeader/PageHeader";
import PeriodComparison from "../components/PeriodComparison/PeriodComparison";
import PeriodFilter from "../components/PeriodFilter/PeriodFilter";
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
import { ALL_PERIODS, resolvePeriod } from "../utils/periods";
import { getSegmentOptions, SEGMENT_OPTIONS } from "../utils/segments";

const KPIS_TITLE = "Indicadores";

const CHARTS = [
  { title: "Comparar períodos", Chart: PeriodComparison, className: "full" },
  { title: "Acumulado x meta", Chart: GoalTrackChart },
  { title: "Previsão de fechamento", Chart: ForecastCard },
  { title: "Forecast", Chart: ForecastSummary },
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
  { title: "Calendário de vendas", Chart: SalesCalendarChart },
];

const PRINT_ITEMS = [KPIS_TITLE, ...CHARTS.map((chart) => chart.title)];

const printDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function ChartsPage() {
  const [periodSelection, setPeriodSelection] = useState(ALL_PERIODS);
  // b2b e b2g abrem (e ficam) no próprio setor
  const { segment: userSegment } = usePermissions();
  const [selectedSegment, setSelectedSegment] = useState(userSegment);
  const [isChoosing, setIsChoosing] = useState(false);
  const [printItems, setPrintItems] = useState(null);
  const period = useMemo(() => resolvePeriod(periodSelection), [periodSelection]);

  useEffect(() => {
    if (!printItems) {
      return undefined;
    }

    const finishPrinting = () => setPrintItems(null);
    window.addEventListener("afterprint", finishPrinting);
    window.print();

    return () => window.removeEventListener("afterprint", finishPrinting);
  }, [printItems]);

  const startPrinting = (items) => {
    setIsChoosing(false);
    setPrintItems({ titles: new Set(items), generatedAt: new Date() });
  };

  const printClass = (title) => (printItems && !printItems.titles.has(title) ? styles.notPrinted : "");

  const periodLabel = period?.label ?? "Todo o período";
  const segmentLabel = SEGMENT_OPTIONS.find((option) => option.value === selectedSegment)?.label;

  return (
    <div className={styles.page}>
      {printItems && (
        <div className={styles.printHeader}>
          <p className={styles.printTitle}>Relatório de vendas · Black Friday</p>
          <p className={styles.printDetails}>
            Período: {periodLabel} · Setor: {segmentLabel} · Gerado em{" "}
            {printDateFormatter.format(printItems.generatedAt)}
          </p>
        </div>
      )}
      <PageHeader title="Gráficos" description="Acompanhamento das vendas da Black Friday">
        <div className={styles.controls}>
          <button className={styles.actionButton} type="button" onClick={() => setIsChoosing(true)}>
            <DownloadIcon />
            Gerar PDF
          </button>
          <PeriodFilter
            selection={periodSelection}
            onChange={setPeriodSelection}
            ariaLabel="Filtrar gráficos por período"
          />
          <label className={styles.field}>
            <span className={styles.label}>Setor</span>
            <select
              className={styles.select}
              aria-label="Filtrar gráficos por setor"
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
        </div>
      </PageHeader>
      <div className={printClass(KPIS_TITLE)}>
        <ErrorBoundary location="Admin › gráficos › indicadores">
          <Suspense fallback={<WidgetFallback title={KPIS_TITLE} />}>
            <SalesKpis period={period} segment={selectedSegment} />
          </Suspense>
        </ErrorBoundary>
      </div>
      <div className={styles.grid}>
        {CHARTS.map(({ title, Chart, className }) => (
          <div key={title} className={`${className ? styles[className] : ""} ${printClass(title)}`}>
            <ErrorBoundary location={`Admin › gráficos › ${title.toLowerCase()}`}>
              <Suspense fallback={<WidgetFallback title={title} />}>
                <Chart period={period} segment={selectedSegment} />
              </Suspense>
            </ErrorBoundary>
          </div>
        ))}
      </div>
      {isChoosing && <PrintDialog items={PRINT_ITEMS} onCancel={() => setIsChoosing(false)} onPrint={startPrinting} />}
    </div>
  );
}
