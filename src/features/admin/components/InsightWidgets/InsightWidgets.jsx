import styles from "./InsightWidgets.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useGoal } from "../../hooks/useGoal";
import { useSalesCharts } from "../../hooks/useSalesCharts";
import { useSalesInsights } from "../../hooks/useSalesInsights";
import { CAMPAIGN_END_DAY } from "../../utils/campaign";
import { CHART_COLORS, segmentColor } from "../../utils/chartColors";
import { formatDay } from "../../utils/chartData";
import { formatPercent, formatSalesCount, formatVariation } from "../../utils/chartScale";
import { WEEKDAYS, forecast, variation } from "../../utils/salesInsights";
import { barRows, formatCsvNumber, timeSeriesRows } from "../../utils/tableCsv";
import BarChart from "../charts/BarChart";
import Heatmap from "../charts/Heatmap";
import ShareBar from "../charts/ShareBar";
import TimeSeriesChart from "../charts/TimeSeriesChart";
import { ChartCard } from "../SalesChartWidgets/SalesChartWidgets";

const NO_SALES = "Nenhuma venda no período";

function Empty({ text = NO_SALES }) {
  return <p className={styles.empty}>{text}</p>;
}

function Delta({ current, previous }) {
  if (previous === null) {
    return <span className={styles.deltaNeutral}>Campanha inteira</span>;
  }

  const change = variation(current, previous);

  if (change === null) {
    return <span className={styles.deltaNeutral}>Sem vendas na semana anterior</span>;
  }

  const isUp = change >= 0;

  return (
    <span className={isUp ? styles.deltaUp : styles.deltaDown}>
      <span aria-hidden="true">{isUp ? "▲" : "▼"}</span> {formatVariation(change)} vs semana anterior
    </span>
  );
}

export function SalesKpis({ weekKey }) {
  const { kpis } = useSalesInsights(weekKey);
  const { goal } = useGoal();
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
            <Delta current={tile.now} previous={previous ? tile.before : null} />
          </dd>
        </dl>
      ))}
      <dl className={`widget ${styles.tile}`}>
        <dt className={styles.tileLabel}>Meta da campanha</dt>
        <dd className={styles.tileValue}>{formatPercent((goal.percent ?? 0) / 100)}</dd>
        <dd className={styles.tileDelta}>
          <span className={styles.deltaNeutral}>de {formatCurrency(goal.goal)}</span>
        </dd>
      </dl>
    </section>
  );
}

export function ForecastCard() {
  const { goal } = useGoal();
  const { campaign } = useSalesCharts("");
  const plan = forecast(campaign, goal.goal, CAMPAIGN_END_DAY);
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
      description={`Se o ritmo atual continuar até ${endLabel}`}
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

const formatWeek = (weekKey) => `Semana de ${formatDay(weekKey)}`;

export function WeeklySalesChart() {
  const { weekly } = useSalesInsights("");
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
      description="Comparativo semana a semana, sem o filtro de semana"
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

export function TicketChart({ weekKey }) {
  const { ticket } = useSalesInsights(weekKey);
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
      weekKey={weekKey}
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

export function SegmentShareChart({ weekKey }) {
  const { segments } = useSalesInsights(weekKey);
  const title = "Participação por setor";
  const items = segments.map((segment) => ({
    ...segment,
    color: segmentColor(segment.label),
  }));

  return (
    <ChartCard
      title={title}
      description="Quanto cada segmento representa do valor vendido"
      csvRows={[
        ["Setor", "Valor (R$)", "Participação (%)"],
        ...items.map((item) => [item.label, formatCsvNumber(item.value), formatCsvNumber(item.share * 100, 1)]),
      ]}
      weekKey={weekKey}
    >
      {items.length === 0 ? <Empty /> : <ShareBar title={title} items={items} formatValue={formatCurrency} />}
    </ChartCard>
  );
}

export function ConcentrationChart({ weekKey }) {
  const { concentration } = useSalesInsights(weekKey);
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
      weekKey={weekKey}
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

export function CancellationChart({ weekKey }) {
  const { cancellations } = useSalesInsights(weekKey);
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
      weekKey={weekKey}
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

export function HeatmapChart({ weekKey }) {
  const { heatmap, activeSales } = useSalesInsights(weekKey);
  const title = "Quando as vendas fecham";
  const formatCell = (cell) => `${formatSalesCount(cell.count)}, ${formatCurrency(cell.value)}`;

  return (
    <ChartCard
      title={title}
      description="Quantidade de vendas por dia da semana e hora, no horário de Brasília"
      csvRows={[
        ["Dia", "Hora", "Vendas", "Valor (R$)"],
        ...WEEKDAYS.flatMap((day, row) =>
          heatmap.cells[row]
            .map((cell, hour) => ({ cell, hour }))
            .filter(({ cell }) => cell.count > 0)
            .map(({ cell, hour }) => [day, `${hour}h`, String(cell.count), formatCsvNumber(cell.value)]),
        ),
      ]}
      weekKey={weekKey}
    >
      {activeSales.length === 0 ? (
        <Empty />
      ) : (
        <Heatmap title={title} rows={WEEKDAYS} cells={heatmap.cells} max={heatmap.max} formatCell={formatCell} />
      )}
    </ChartCard>
  );
}
