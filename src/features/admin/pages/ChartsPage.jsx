import styles from "./ChartsPage.module.css";

import { Suspense, useEffect, useMemo, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import usePermissions from "../../auth/hooks/usePermissions";
import {
  CancellationChart,
  ConcentrationChart,
  SalesCalendarChart,
  SalesKpis,
  SegmentShareChart,
  TicketChart,
  WeeklySalesChart,
} from "../components/InsightWidgets/InsightWidgets";
import { ForecastSummary } from "../components/ForecastWidgets/ForecastWidgets";
import PageHeader from "../components/PageHeader/PageHeader";
import { PeoplePointsChart } from "../components/PeoplePoints/PeoplePoints";
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
import { TeamPointsChart, TeamPointsEvolution } from "../components/TeamPointsWidgets/TeamPointsWidgets";
import VendorProfile from "../components/VendorProfile/VendorProfile";
import WidgetFallback from "../components/WidgetFallback/WidgetFallback";
import { ALL_PERIODS, resolvePeriod } from "../utils/periods";
import { getSegmentOptions, SEGMENT_OPTIONS } from "../utils/segments";

const KPIS_TITLE = "Indicadores";

const SECTIONS = [
  {
    id: "visao-geral",
    title: "Visão geral",
    charts: [
      { title: "Acumulado x meta", Chart: GoalTrackChart },
      { title: "Forecast", Chart: ForecastSummary },
    ],
  },
  {
    id: "vendas",
    title: "Vendas",
    charts: [
      { title: "Vendas acumuladas", Chart: TotalSalesChart },
      { title: "Vendas acumuladas por setor", Chart: SegmentSalesChart },
      { title: "Vendas x renovações por dia", Chart: FunnelSalesChart },
      { title: "Vendas por semana", Chart: WeeklySalesChart },
      { title: "Calendário de vendas", Chart: SalesCalendarChart, className: "full" },
    ],
  },
  {
    id: "pessoas-e-equipes",
    title: "Pessoas e equipes",
    charts: [
      { title: "Vendas por pessoa", Chart: VendorSalesChart, className: "tall" },
      { title: "Vendas por equipe", Chart: TeamSalesChart },
      { title: "Passagens por pessoa", Chart: PassageChart },
      { title: "Pontos por equipe", Chart: TeamPointsChart },
      { title: "Evolução dos pontos", Chart: TeamPointsEvolution },
      { title: "Pontos por pessoa", Chart: PeoplePointsChart, className: "full" },
      { title: "Ticket médio", Chart: TicketChart, className: "full" },
    ],
  },
  {
    id: "analises",
    title: "Análises",
    charts: [
      { title: "Comparar períodos", Chart: PeriodComparison, className: "full" },
      { title: "Participação por setor", Chart: SegmentShareChart },
      { title: "Concentração", Chart: ConcentrationChart },
      { title: "Cancelamentos", Chart: CancellationChart },
    ],
  },
];

const CHARTS = SECTIONS.flatMap((section) => section.charts);

const PRINT_ITEMS = [KPIS_TITLE, ...CHARTS.map((chart) => chart.title)];

const goToSection = (id) => document.getElementById(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" });

const printDateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function ChartsPage() {
  const [periodSelection, setPeriodSelection] = useState(ALL_PERIODS);
  // b2b e b2g abrem (e ficam) no próprio setor
  const { segment: userSegment } = usePermissions();
  const [selectedSegment, setSelectedSegment] = useState(userSegment);
  const [isChoosing, setIsChoosing] = useState(false);
  const [printItems, setPrintItems] = useState(null);
  const [profileVendor, setProfileVendor] = useState(null);
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
          <p className={styles.printTitle}>Relatório de vendas · Campanha</p>
          <p className={styles.printDetails}>
            Período: {periodLabel} · Setor: {segmentLabel} · Gerado em{" "}
            {printDateFormatter.format(printItems.generatedAt)}
          </p>
        </div>
      )}
      <PageHeader title="Gráficos" description="Acompanhamento das vendas da campanha">
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
      <nav className={styles.sectionNav} aria-label="Seções dos gráficos">
        {SECTIONS.map((section) => (
          <button key={section.id} className={styles.sectionLink} type="button" onClick={() => goToSection(section.id)}>
            {section.title}
          </button>
        ))}
      </nav>
      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className={styles.section} aria-labelledby={`${section.id}-titulo`}>
          <p id={`${section.id}-titulo`} className={styles.sectionTitle}>
            {section.title}
          </p>
          <div className={styles.grid}>
            {section.charts.map(({ title, Chart, className }) => (
              <div key={title} className={`${className ? styles[className] : ""} ${printClass(title)}`}>
                <ErrorBoundary location={`Admin › gráficos › ${title.toLowerCase()}`}>
                  <Suspense fallback={<WidgetFallback title={title} />}>
                    <Chart period={period} segment={selectedSegment} onSelectVendor={setProfileVendor} />
                  </Suspense>
                </ErrorBoundary>
              </div>
            ))}
          </div>
        </section>
      ))}
      {profileVendor && (
        <VendorProfile vendor={profileVendor} segment={selectedSegment} onClose={() => setProfileVendor(null)} />
      )}
      {isChoosing && <PrintDialog items={PRINT_ITEMS} onCancel={() => setIsChoosing(false)} onPrint={startPrinting} />}
    </div>
  );
}
