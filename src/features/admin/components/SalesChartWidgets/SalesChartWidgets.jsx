import styles from "./SalesChartWidgets.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useGoal } from "../../hooks/useGoal";
import { useSalesCharts } from "../../hooks/useSalesCharts";
import { useTeams } from "../../hooks/useTeams";
import { CHART_COLORS, segmentColor } from "../../utils/chartColors";
import { totalsByTeam } from "../../utils/chartData";
import { formatCompactCurrency, formatPassages } from "../../utils/chartScale";
import BarChart from "../charts/BarChart";
import TimeSeriesChart from "../charts/TimeSeriesChart";

export function ChartCard({ title, description, children }) {
  return (
    <section className="widget" aria-label={title}>
      <header className={styles.header}>
        <h2 className="title">{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

function Empty({ text }) {
  return <p className={styles.empty}>{text}</p>;
}

const NO_SALES = "Nenhuma venda no período";

export function TotalSalesChart({ weekKey }) {
  const { days, activeSales, total } = useSalesCharts(weekKey);
  const title = "Vendas acumuladas";

  return (
    <ChartCard title={title} description="Valor vendido somado dia a dia, vendas e renovações">
      {activeSales.length === 0 ? (
        <Empty text={NO_SALES} />
      ) : (
        <TimeSeriesChart
          title={title}
          days={days}
          series={[{ key: "total", label: "Vendido", color: CHART_COLORS.blue, values: total }]}
          formatValue={formatCurrency}
        />
      )}
    </ChartCard>
  );
}

export function SegmentSalesChart({ weekKey }) {
  const { days, activeSales, bySegment } = useSalesCharts(weekKey);
  const title = "Vendas acumuladas por setor";

  return (
    <ChartCard title={title} description="Valor vendido somado dia a dia, por segmento">
      {activeSales.length === 0 ? (
        <Empty text={NO_SALES} />
      ) : (
        <TimeSeriesChart
          title={title}
          days={days}
          series={bySegment.map((segment) => ({ ...segment, color: segmentColor(segment.label) }))}
          formatValue={formatCurrency}
        />
      )}
    </ChartCard>
  );
}

export function GoalTrackChart() {
  const { goal } = useGoal();
  const { campaign } = useSalesCharts("");
  const title = "Acumulado x meta";

  return (
    <ChartCard title={title} description="Campanha inteira, sem o filtro de semana">
      {campaign.days.length === 0 ? (
        <Empty text="Nenhuma venda ainda" />
      ) : (
        <TimeSeriesChart
          title={title}
          days={campaign.days}
          series={[{ key: "total", label: "Vendido", color: CHART_COLORS.blue, values: campaign.total }]}
          reference={{ value: goal.goal, label: `Meta ${formatCompactCurrency(goal.goal)}` }}
          formatValue={formatCurrency}
        />
      )}
    </ChartCard>
  );
}

export function FunnelSalesChart({ weekKey }) {
  const { days, activeSales, byFunnel } = useSalesCharts(weekKey);
  const title = "Vendas x renovações por dia";

  return (
    <ChartCard title={title} description="Valor vendido em cada dia">
      {activeSales.length === 0 ? (
        <Empty text={NO_SALES} />
      ) : (
        <TimeSeriesChart
          title={title}
          days={days}
          variant="columns"
          series={[
            { key: "sales", label: "Vendas", color: CHART_COLORS.blue, values: byFunnel.sales },
            { key: "renewals", label: "Renovações", color: CHART_COLORS.orange, values: byFunnel.renewals },
          ]}
          formatValue={formatCurrency}
        />
      )}
    </ChartCard>
  );
}

export function VendorSalesChart({ weekKey }) {
  const { byVendor } = useSalesCharts(weekKey);
  const title = "Vendas por pessoa";

  return (
    <ChartCard title={title} description="Valor vendido por vendedor, vendas e renovações">
      {byVendor.length === 0 ? (
        <Empty text={NO_SALES} />
      ) : (
        <BarChart title={title} items={byVendor} color={CHART_COLORS.blue} formatValue={formatCurrency} />
      )}
    </ChartCard>
  );
}

export function TeamSalesChart({ weekKey }) {
  const { activeSales } = useSalesCharts(weekKey);
  const { teams } = useTeams();
  const items = totalsByTeam(activeSales, teams);
  const title = "Vendas por equipe";

  return (
    <ChartCard title={title} description="Valor vendido por equipe, vendas e renovações">
      {items.length === 0 ? (
        <Empty text="Nenhuma equipe cadastrada" />
      ) : (
        <BarChart title={title} items={items} color={CHART_COLORS.blue} formatValue={formatCurrency} />
      )}
    </ChartCard>
  );
}

export function PassageChart({ weekKey }) {
  const { passages } = useSalesCharts(weekKey);
  const title = "Passagens por pessoa";

  return (
    <ChartCard title={title} description="Quantidade de passagens em vendas ativas">
      {passages.length === 0 ? (
        <Empty text="Nenhuma passagem no período" />
      ) : (
        <BarChart title={title} items={passages} color={CHART_COLORS.blue} formatValue={formatPassages} />
      )}
    </ChartCard>
  );
}
