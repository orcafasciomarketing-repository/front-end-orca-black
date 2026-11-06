import styles from "./InsightWidgets.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useGoal } from "../../hooks/useGoal";
import { useSalesCharts } from "../../hooks/useSalesCharts";
import { useSalesInsights } from "../../hooks/useSalesInsights";
import { CAMPAIGN_END_DAY } from "../../utils/campaign";
import { CHART_COLORS, segmentColor } from "../../utils/chartColors";
import { formatDay } from "../../utils/chartData";
import { getSegmentGoal } from "../../utils/segments";
import { formatPercent, formatSalesCount, formatVariation } from "../../utils/chartScale";
import { comparisonLabel } from "../../utils/periods";
import { WEEKDAYS, forecast, variation } from "../../utils/salesInsights";
import { barRows, formatCsvNumber, timeSeriesRows } from "../../utils/tableCsv";
import BarChart from "../charts/BarChart";
import SalesCalendar from "../charts/SalesCalendar";
import ShareBar from "../charts/ShareBar";
import TimeSeriesChart from "../charts/TimeSeriesChart";
import { ChartCard } from "../SalesChartWidgets/SalesChartWidgets";

const NO_SALES = "Nenhuma venda no período";

function Empty({ text = NO_SALES }) {
  return <p className={styles.empty}>{text}</p>;
}

function Delta({ current, previous, period }) {
  if (!period) {
    return <span className={styles.deltaNeutral}>Campanha inteira</span>;
  }

  const change = variation(current, previous);

  if (change === null) {
    return (
      <span className={styles.deltaNeutral}>
        Sem vendas {period.type === "week" ? "na" : "no"} {comparisonLabel(period)}
      </span>
    );
  }

  const isUp = change >= 0;

  return (
    <span className={isUp ? styles.deltaUp : styles.deltaDown}>
      <span aria-hidden="true">{isUp ? "▲" : "▼"}</span> {formatVariation(change)} vs {comparisonLabel(period)}
    </span>
  );
}

export function SalesKpis({ period, segment }) {
  const { kpis, campaignTotal } = useSalesInsights(period, segment);
  const { goal } = useGoal();
  const segmentGoal = getSegmentGoal(goal, segment);
  const { current, previous } = kpis;

  const tiles = [
    {
      label: "Total vendido",
      value: formatCurrency(current.total),
      now: current.total,
      before: previous?.total,
    },
    {
      label: "Vendas fechadas",
      value: current.count,
      now: current.count,
      before: previous?.count,
    },
    {
      label: "Ticket médio",
      value: formatCurrency(current.average),
      now: current.average,
      before: previous?.average,
    },
  ];

  return (
    <section className={styles.kpis} aria-label="Indicadores">
      {tiles.map((tile) => (
        <dl key={tile.label} className={`widget ${styles.tile}`}>
          <dt className={styles.tileLabel}>{tile.label}</dt>
          <dd className={styles.tileValue}>{tile.value}</dd>
          <dd className={styles.tileDelta}>
            <Delta current={tile.now} previous={tile.before} period={period} />
          </dd>
        </dl>
      ))}
      <dl className={`widget ${styles.tile}`}>
        <dt className={styles.tileLabel}>
          {!segment ? "Meta da campanha" : segmentGoal.isTotal ? `${segment} na meta da campanha` : `Meta ${segment}`}
        </dt>
        <dd className={styles.tileValue}>
          {formatPercent(
            segment ? (segmentGoal.value ? campaignTotal / segmentGoal.value : 0) : (goal.percent ?? 0) / 100,
          )}
        </dd>
        <dd className={styles.tileDelta}>
          <span className={styles.deltaNeutral}>de {formatCurrency(segmentGoal.value)}</span>
        </dd>
      </dl>
    </section>
  );
}

export function ForecastCard({ segment }) {
  const { goal } = useGoal();
  const { campaign } = useSalesCharts(null, segment);
  const segmentGoal = getSegmentGoal(goal, segment);
  const goalLabel = segmentGoal.isTotal ? "meta total" : `meta de ${segment}`;
  const plan = forecast(campaign, segmentGoal.value, CAMPAIGN_END_DAY);
  const title = "Previsão de fechamento";
  const endLabel = formatDay(CAMPAIGN_END_DAY);

  const rows = [
    ["Média por dia até hoje", formatCurrency(plan.dailyAverage)],
    ["Ritmo necessário por dia", plan.reached ? "Meta batida" : formatCurrency(plan.requiredPerDay)],
    ["Dias restantes até " + endLabel, plan.ended ? "Encerrada" : plan.daysLeft],
    ["Falta para a meta", formatCurrency(plan.remaining)],
  ];

  return (
    <ChartCard
      title={title}
      description={
        segment
          ? `Se o ritmo atual de ${segment} continuar até ${endLabel}, contra a ${goalLabel}`
          : `Se o ritmo atual continuar até ${endLabel}`
      }
      segment={segment}
      csvRows={[
        ["Indicador", "Valor"],
        ["Projeção (R$)", formatCsvNumber(plan.projection)],
        ["Meta (R$)", formatCsvNumber(plan.goal)],
        ["Média por dia (R$)", formatCsvNumber(plan.dailyAverage)],
        ["Ritmo necessário por dia (R$)", formatCsvNumber(plan.requiredPerDay)],
        ["Dias restantes", String(plan.daysLeft)],
      ]}
    >
      <div className={styles.forecast}>
        <div>
          <p className={styles.heroLabel}>{plan.ended ? "Fechou em" : "Projeção para " + endLabel}</p>
          <p className={styles.hero}>{formatCurrency(plan.ended ? plan.sold : plan.projection)}</p>
          <p className={styles.status}>
            <span className={plan.willHit ? styles.statusGood : styles.statusBad} aria-hidden="true">
              {plan.willHit ? "✓" : "!"}
            </span>
            {plan.willHit
              ? "No ritmo atual, a meta é batida"
              : `No ritmo atual, ficam faltando ${formatCurrency(plan.goal - plan.projection)}`}
          </p>
        </div>
        <dl className={styles.facts}>
          {rows.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </ChartCard>
  );
}

const formatWeek = (week) => `Semana de ${formatDay(week)}`;

export function WeeklySalesChart({ segment }) {
  const { weekly } = useSalesInsights(null, segment);
  const title = "Vendas por semana";
  const series = [
    {
      key: "sales",
      label: "Vendas",
      color: CHART_COLORS.blue,
      values: weekly.sales,
    },
    {
      key: "renewals",
      label: "Renovações",
      color: CHART_COLORS.orange,
      values: weekly.renewals,
    },
  ];

  return (
    <ChartCard
      title={title}
      description="Comparativo semana a semana, sem o filtro de período"
      segment={segment}
      csvRows={timeSeriesRows(weekly.weeks, series, {
        column: "Semana",
        formatLabel: formatWeek,
      })}
    >
      {weekly.weeks.length === 0 ? (
        <Empty />
      ) : (
        <TimeSeriesChart
          title={title}
          days={weekly.weeks}
          variant="columns"
          series={series}
          formatValue={formatCurrency}
          formatTitle={formatWeek}
          columnLabel="Semana"
        />
      )}
    </ChartCard>
  );
}

export function TicketChart({ period, segment }) {
  const { ticket } = useSalesInsights(period, segment);
  const title = "Ticket médio";

  return (
    <ChartCard
      title={title}
      description="Valor médio de cada venda, por setor e por pessoa"
      csvRows={[
        ...barRows(ticket.bySegment, {
          column: "Setor",
          detail: "Vendas",
          value: "Ticket médio (R$)",
        }),
        ...barRows(ticket.byVendor, {
          column: "Vendedor",
          detail: "Vendas",
          value: "Ticket médio (R$)",
        }),
      ]}
      period={period}
      segment={segment}
    >
      {ticket.byVendor.length === 0 ? (
        <Empty />
      ) : (
        <div className={styles.stack}>
          <div className={styles.group}>
            <h3 className={styles.subtitle}>Por setor</h3>
            <BarChart
              title="Ticket médio por setor"
              items={ticket.bySegment}
              color={CHART_COLORS.blue}
              formatValue={formatCurrency}
            />
          </div>
          <div className={styles.group}>
            <h3 className={styles.subtitle}>Por pessoa</h3>
            <BarChart
              title="Ticket médio por pessoa"
              items={ticket.byVendor}
              color={CHART_COLORS.blue}
              formatValue={formatCurrency}
            />
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export function SegmentShareChart({ period, segment }) {
  const { segments } = useSalesInsights(period, segment);
  const title = "Participação por setor";
  const items = segments.map((item) => ({
    ...item,
    color: segmentColor(item.label),
  }));

  return (
    <ChartCard
      title={title}
      description="Quanto cada segmento representa do valor vendido"
      csvRows={[
        ["Setor", "Valor (R$)", "Participação (%)"],
        ...items.map((item) => [item.label, formatCsvNumber(item.value), formatCsvNumber(item.share * 100, 1)]),
      ]}
      period={period}
      segment={segment}
    >
      {items.length === 0 ? <Empty /> : <ShareBar title={title} items={items} formatValue={formatCurrency} />}
    </ChartCard>
  );
}

export function ConcentrationChart({ period, segment }) {
  const { concentration } = useSalesInsights(period, segment);
  const { top, topShare, rest } = concentration;
  const title = "Concentração";
  const items = [
    ...top.map((item, index) => ({
      ...item,
      label: `${index + 1}º ${item.label}`,
      color: CHART_COLORS.blue,
    })),
    ...(rest.count
      ? [
          {
            key: "rest",
            label: `Demais (${rest.count})`,
            value: rest.value,
            share: rest.share,
            color: CHART_COLORS.rest,
            details: rest.items.map((item, index) => ({
              ...item,
              label: `${top.length + index + 1}º ${item.label}`,
            })),
          },
        ]
      : []),
  ];

  return (
    <ChartCard
      title={title}
      description="Quanto do valor vendido vem dos 3 maiores vendedores"
      csvRows={[
        ["Vendedor", "Valor (R$)", "Participação (%)"],
        ...items.map((item) => [item.label, formatCsvNumber(item.value), formatCsvNumber(item.share * 100, 1)]),
      ]}
      period={period}
      segment={segment}
    >
      {top.length === 0 ? (
        <Empty />
      ) : (
        <div className={styles.stack}>
          <p className={styles.headline}>
            <strong className={styles.hero}>{formatPercent(topShare)}</strong>
            <span>do total vem {top.length === 1 ? "do maior vendedor" : `dos ${top.length} maiores vendedores`}</span>
          </p>
          <ShareBar title={title} items={items} formatValue={formatCurrency} />
        </div>
      )}
    </ChartCard>
  );
}

export function CancellationChart({ period, segment }) {
  const { cancellations } = useSalesInsights(period, segment);
  const title = "Cancelamentos";

  return (
    <ChartCard
      title={title}
      description="Vendas canceladas no período e quem mais perdeu"
      csvRows={[
        ["Taxa de cancelamento (%)", formatCsvNumber(cancellations.rate * 100, 1)],
        ["Valor perdido (R$)", formatCsvNumber(cancellations.lostValue)],
        [],
        ...barRows(cancellations.byVendor, {
          column: "Vendedor",
          detail: "Canceladas",
          value: "Valor perdido (R$)",
        }),
      ]}
      period={period}
      segment={segment}
    >
      {cancellations.closed === 0 ? (
        <Empty />
      ) : (
        <div className={styles.stack}>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt>Taxa de cancelamento</dt>
              <dd>{formatPercent(cancellations.rate)}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Canceladas</dt>
              <dd>
                {cancellations.count} de {cancellations.closed}
              </dd>
            </div>
            <div className={styles.fact}>
              <dt>Valor perdido</dt>
              <dd>{formatCurrency(cancellations.lostValue)}</dd>
            </div>
          </dl>
          {cancellations.count === 0 ? (
            <Empty text="Nenhuma venda cancelada no período" />
          ) : (
            <BarChart
              title="Valor cancelado por pessoa"
              items={cancellations.byVendor}
              color={CHART_COLORS.orange}
              formatValue={formatCurrency}
            />
          )}
        </div>
      )}
    </ChartCard>
  );
}

export function SalesCalendarChart({ period, segment }) {
  const { calendar } = useSalesInsights(period, segment);
  const title = "Calendário de vendas";

  return (
    <ChartCard
      title={title}
      description="Todos os dias de cada mês, com as vendas do dia e o total de cada semana e de cada dia da semana"
      csvRows={[
        ["Data", "Dia da semana", "Vendas", "Valor (R$)"],
        ...calendar.months.flatMap((month) =>
          month.weeks.flatMap((week) =>
            week.cells
              .map((cell, index) => ({ cell, weekday: WEEKDAYS[index] }))
              .filter(({ cell }) => cell.inPeriod)
              .map(({ cell, weekday }) => [
                formatDay(cell.day),
                weekday,
                String(cell.count),
                formatCsvNumber(cell.value),
              ]),
          ),
        ),
      ]}
      period={period}
      segment={segment}
    >
      <SalesCalendar
        weekdays={WEEKDAYS}
        calendar={calendar}
        formatDetail={(cell) => `${formatSalesCount(cell.count)}, ${formatCurrency(cell.value)}`}
      />
    </ChartCard>
  );
}
