import styles from "./SalesChartWidgets.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useGoal } from "../../hooks/useGoal";
import { useSalesCharts } from "../../hooks/useSalesCharts";
import { useTeams } from "../../hooks/useTeams";
import { CHART_COLORS, segmentColor } from "../../utils/chartColors";
import { CAMPAIGN_END_DAY } from "../../utils/campaign";
import { formatDay, totalsByTeam } from "../../utils/chartData";
import { formatCompactCurrency, formatPassages } from "../../utils/chartScale";
import { downloadFile } from "../../utils/downloadFile";
import { goalTrack } from "../../utils/salesInsights";
import { getSegmentGoal } from "../../utils/segments";
import { barRows, buildChartFileName, tableToCsv, timeSeriesRows } from "../../utils/tableCsv";
import BarChart from "../charts/BarChart";
import TimeSeriesChart from "../charts/TimeSeriesChart";
import { DownloadIcon } from "../Icons/Icons";

export function ChartCard({ title, description, csvRows, period, segment, children }) {
  const exportCsv = () =>
    downloadFile(tableToCsv(csvRows), buildChartFileName({ title, period, segment }), "text/csv;charset=utf-8");

  return (
    <section className="widget" aria-label={title}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 className="title">{title}</h2>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {csvRows?.length > 1 && (
          <button
            className={styles.exportButton}
            type="button"
            aria-label={`Exportar CSV: ${title}`}
            title="Exportar CSV"
            onClick={exportCsv}
          >
            <DownloadIcon />
            CSV
          </button>
        )}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

function Empty({ text }) {
  return <p className={styles.empty}>{text}</p>;
}

const NO_SALES = "Nenhuma venda no período";

const dayRows = (days, series) => timeSeriesRows(days, series, { formatLabel: formatDay });

export function TotalSalesChart({ period, segment }) {
  const { days, activeSales, total } = useSalesCharts(period, segment);
  const title = "Vendas acumuladas";
  const series = [{ key: "total", label: "Vendido", color: CHART_COLORS.blue, values: total }];

  return (
    <ChartCard
      title={title}
      description="Valor vendido somado dia a dia, vendas e renovações"
      csvRows={dayRows(days, series)}
      period={period}
      segment={segment}
    >
      {activeSales.length === 0 ? (
        <Empty text={NO_SALES} />
      ) : (
        <TimeSeriesChart title={title} days={days} series={series} formatValue={formatCurrency} />
      )}
    </ChartCard>
  );
}

export function SegmentSalesChart({ period, segment }) {
  const { days, activeSales, bySegment } = useSalesCharts(period, segment);
  const title = "Vendas acumuladas por setor";
  const series = bySegment.map((item) => ({
    ...item,
    color: segmentColor(item.label),
  }));

  return (
    <ChartCard
      title={title}
      description="Valor vendido somado dia a dia, por segmento"
      csvRows={dayRows(days, series)}
      period={period}
      segment={segment}
    >
      {activeSales.length === 0 ? (
        <Empty text={NO_SALES} />
      ) : (
        <TimeSeriesChart title={title} days={days} series={series} formatValue={formatCurrency} />
      )}
    </ChartCard>
  );
}

export function GoalTrackChart({ segment }) {
  const { goal } = useGoal();
  const { campaign } = useSalesCharts("", segment);
  const title = "Acumulado x meta";
  const segmentGoal = getSegmentGoal(goal, segment);
  const goalLabel = segmentGoal.isTotal ? "meta total" : `meta de ${segment}`;
  const track = goalTrack(campaign, segmentGoal.value, CAMPAIGN_END_DAY);
  const series = [
    {
      key: "actual",
      label: "Vendido",
      color: CHART_COLORS.blue,
      values: track.actual,
    },
    track.projection && {
      key: "projection",
      label: "Projeção no ritmo atual",
      color: CHART_COLORS.blue,
      dashed: true,
      values: track.projection,
    },
    track.required && {
      key: "required",
      label: "Ritmo necessário",
      color: CHART_COLORS.orange,
      dashed: true,
      values: track.required,
    },
  ].filter(Boolean);

  return (
    <ChartCard
      title={title}
      description={
        segment
          ? `${segment} contra a ${goalLabel}, até ${formatDay(CAMPAIGN_END_DAY)}, sem o filtro de período`
          : `Campanha inteira até ${formatDay(CAMPAIGN_END_DAY)}, sem o filtro de período`
      }
      csvRows={dayRows(track.days, series)}
      segment={segment}
    >
      {campaign.days.length === 0 ? (
        <Empty text="Nenhuma venda ainda" />
      ) : (
        <TimeSeriesChart
          title={title}
          days={track.days}
          series={series}
          reference={{
            value: segmentGoal.value,
            label: `Meta ${formatCompactCurrency(segmentGoal.value)}`,
          }}
          formatValue={formatCurrency}
        />
      )}
    </ChartCard>
  );
}

export function FunnelSalesChart({ period, segment }) {
  const { days, activeSales, byFunnel } = useSalesCharts(period, segment);
  const title = "Vendas x renovações por dia";
  const series = [
    {
      key: "sales",
      label: "Vendas",
      color: CHART_COLORS.blue,
      values: byFunnel.sales,
    },
    {
      key: "renewals",
      label: "Renovações",
      color: CHART_COLORS.orange,
      values: byFunnel.renewals,
    },
  ];

  return (
    <ChartCard
      title={title}
      description="Valor vendido em cada dia"
      csvRows={dayRows(days, series)}
      period={period}
      segment={segment}
    >
      {activeSales.length === 0 ? (
        <Empty text={NO_SALES} />
      ) : (
        <TimeSeriesChart title={title} days={days} variant="columns" series={series} formatValue={formatCurrency} />
      )}
    </ChartCard>
  );
}

export function VendorSalesChart({ period, segment }) {
  const { byVendor } = useSalesCharts(period, segment);
  const title = "Vendas por pessoa";

  return (
    <ChartCard
      title={title}
      description="Valor vendido por vendedor, vendas e renovações"
      csvRows={barRows(byVendor, { column: "Vendedor" })}
      period={period}
      segment={segment}
    >
      {byVendor.length === 0 ? (
        <Empty text={NO_SALES} />
      ) : (
        <BarChart title={title} items={byVendor} color={CHART_COLORS.blue} formatValue={formatCurrency} />
      )}
    </ChartCard>
  );
}

export function TeamSalesChart({ period, segment }) {
  const { activeSales } = useSalesCharts(period, segment);
  const { teams } = useTeams();
  const items = totalsByTeam(activeSales, teams);
  const title = "Vendas por equipe";

  return (
    <ChartCard
      title={title}
      description="Valor vendido por equipe, vendas e renovações"
      csvRows={barRows(items, { column: "Equipe" })}
      period={period}
      segment={segment}
    >
      {items.length === 0 ? (
        <Empty text="Nenhuma equipe cadastrada" />
      ) : (
        <BarChart title={title} items={items} color={CHART_COLORS.blue} formatValue={formatCurrency} />
      )}
    </ChartCard>
  );
}

export function PassageChart({ period, segment }) {
  const { passages } = useSalesCharts(period, segment);
  const title = "Passagens por pessoa";

  return (
    <ChartCard
      title={title}
      description="Quantidade de passagens em vendas ativas"
      csvRows={barRows(passages, {
        column: "Pessoa",
        detail: "Cargo",
        value: "Passagens",
        digits: 0,
      })}
      period={period}
      segment={segment}
    >
      {passages.length === 0 ? (
        <Empty text="Nenhuma passagem no período" />
      ) : (
        <BarChart title={title} items={passages} color={CHART_COLORS.blue} formatValue={formatPassages} />
      )}
    </ChartCard>
  );
}
