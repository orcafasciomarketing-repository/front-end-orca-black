import styles from "./GoalEvolution.module.css";

import { Suspense, useState } from "react";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import TimeSeriesChart from "../../../admin/components/charts/TimeSeriesChart";
import { ChartCard } from "../../../admin/components/SalesChartWidgets/SalesChartWidgets";
import WidgetFallback from "../../../admin/components/WidgetFallback/WidgetFallback";
import { CHART_COLORS } from "../../../admin/utils/chartColors";
import { formatDay } from "../../../admin/utils/chartData";
import { useGoalHistory } from "../../hooks/useGoals";
import { formatMonth, formatShortDay, TIER_LABELS, untilToday } from "../../utils/goalMath";

const VIEWS = [
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

const TIER_COLORS = { goal: "var(--color-primary)", super: CHART_COLORS.aqua, black: "var(--color-text)" };

const SHORT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const shortMonth = (month) => `${SHORT_MONTHS[Number(month.slice(5, 7)) - 1]}/${month.slice(2, 4)}`;

const tierSeries = (tiers, valuesOf, { dashed = false } = {}) =>
  ["goal", "super", "black"]
    .filter((tier) => tiers.some((item) => item && item[tier] > 0))
    .map((tier) => ({
      key: tier,
      label: TIER_LABELS[tier],
      color: TIER_COLORS[tier],
      dashed,
      values: valuesOf(tier),
    }));

export default function GoalEvolution({ label, scope, progress, pickHistory, useHistory = useGoalHistory }) {
  const [view, setView] = useState("daily");

  return (
    <ChartCard title={`Evolução · ${label}`} description={DESCRIPTIONS[view]}>
      <div className={styles.tabs} role="group" aria-label={`Visão da evolução de ${label}`}>
        {VIEWS.map((item) => (
          <button
            key={item.value}
            className={`${styles.tab} ${item.value === view ? styles.tabActive : ""}`}
            type="button"
            aria-pressed={item.value === view}
            onClick={() => setView(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {view === "daily" && <DailyView label={label} scope={scope} progress={progress} />}
      {view === "weekly" && <WeeklyView label={label} scope={scope} />}
      {view === "monthly" && (
        <Suspense fallback={<WidgetFallback title="Histórico dos meses" />}>
          <MonthlyView label={label} month={progress.month} pickHistory={pickHistory} useHistory={useHistory} />
        </Suspense>
      )}
    </ChartCard>
  );
}

const DESCRIPTIONS = {
  daily:
    "Realizado acumulado no mês, a previsão realista do forecast até o fim do mês e as linhas da Meta, da Super meta e da Meta black",
  weekly: "Realizado de cada semana do mês comparado à Meta, à Super meta e à Meta black da semana",
  monthly: "Realizado de cada mês comparado às faixas do mês. Meses sem meta cadastrada mostram só o realizado",
};

function DailyView({ label, scope, progress }) {
  const { days, today } = progress;
  const realized = untilToday(scope.cumulative, days, today);
  const daily = realized.map((value, index) =>
    value === null ? null : Math.round((value - (index > 0 ? (realized[index - 1] ?? 0) : 0)) * 100) / 100,
  );
  const tiers = scope.month.tiers;
  const forecastLine = scope.forecast?.trajectory?.realistic ?? [];
  const series = [
    { key: "realized", label: "Realizado", color: CHART_COLORS.blue, values: realized },
    ...(forecastLine.some((value) => value !== null)
      ? [
          {
            key: "forecast",
            label: "Previsão realista",
            color: CHART_COLORS.orange,
            dashed: true,
            values: forecastLine,
          },
        ]
      : []),
    ...tierSeries([tiers], (tier) => days.map(() => tiers[tier]), { dashed: true }),
  ];

  return (
    <div className={styles.charts}>
      <TimeSeriesChart
        title={`Evolução diária acumulada de ${label}`}
        days={days}
        series={series}
        formatValue={formatCurrency}
        formatLabel={formatDay}
      />
      <h4 className={styles.subtitle}>Vendido por dia</h4>
      <TimeSeriesChart
        title={`Vendido por dia de ${label}`}
        days={days}
        variant="columns"
        series={[{ key: "daily", label: "Vendido no dia", color: CHART_COLORS.blue, values: daily }]}
        formatValue={formatCurrency}
        formatLabel={formatDay}
      />
    </div>
  );
}

function WeeklyView({ label, scope }) {
  const weeks = scope.weeks;
  const starts = weeks.map((week) => week.start);
  const byStart = new Map(weeks.map((week) => [week.start, week]));
  const series = [
    { key: "realized", label: "Realizado", color: CHART_COLORS.blue, values: weeks.map((week) => week.realized) },
    ...tierSeries(
      weeks.map((week) => week.tiers),
      (tier) => weeks.map((week) => week.tiers[tier]),
    ),
  ];

  return (
    <TimeSeriesChart
      title={`Evolução semanal de ${label}`}
      days={starts}
      variant="columns"
      series={series}
      formatValue={formatCurrency}
      formatLabel={(start) => `Sem. ${byStart.get(start).index + 1}`}
      formatTitle={(start) => {
        const week = byStart.get(start);
        return `Semana ${week.index + 1} · ${formatShortDay(week.start)} a ${formatShortDay(week.end)}`;
      }}
      columnLabel="Semana"
    />
  );
}

function MonthlyView({ label, month, pickHistory, useHistory }) {
  const { history } = useHistory(month);
  const rows = history.months.map((item) => ({ month: item.month, ...pickHistory(item) }));
  const series = [
    { key: "realized", label: "Realizado", color: CHART_COLORS.blue, values: rows.map((row) => row.realized) },
    ...tierSeries(
      rows.map((row) => row.tiers),
      (tier) => rows.map((row) => (row.tiers ? row.tiers[tier] || null : null)),
    ),
  ];

  return (
    <TimeSeriesChart
      title={`Evolução mensal de ${label}`}
      days={rows.map((row) => row.month)}
      variant="columns"
      series={series}
      formatValue={formatCurrency}
      formatLabel={shortMonth}
      formatTitle={formatMonth}
      columnLabel="Mês"
    />
  );
}
