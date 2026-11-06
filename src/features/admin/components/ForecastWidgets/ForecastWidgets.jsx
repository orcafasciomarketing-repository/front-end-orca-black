import styles from "./ForecastWidgets.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useForecast } from "../../hooks/useForecast";
import { CHART_COLORS } from "../../utils/chartColors";
import { formatDay } from "../../utils/chartData";
import { formatCompactCurrency, formatPercent } from "../../utils/chartScale";
import { formatCsvNumber, timeSeriesRows } from "../../utils/tableCsv";
import TimeSeriesChart from "../charts/TimeSeriesChart";
import { ChartCard } from "../SalesChartWidgets/SalesChartWidgets";

// Forecast calculado no backend (GET /analytics/forecast): ritmo ponderado e cenários 80% / 100% / 120%

const SCENARIOS = [
  { key: "realistic", label: "Realista", factor: "100% do ritmo" },
  { key: "pessimistic", label: "Pessimista", factor: "80% do ritmo" },
  { key: "optimistic", label: "Otimista", factor: "120% do ritmo" },
];

const PRODUCTIVE_DAYS_NOTE = "seg. a sáb., sem feriados";

// A API devolve percentuais de 0 a 100; o formatPercent espera a fração
const formatApiPercent = (percent) => formatPercent(percent / 100);
const perDay = (value) => `${formatCurrency(value)}/dia`;
const goalLabelOf = (forecast, segment) => (forecast.goalIsTotal ? "Meta total" : `Meta ${segment}`);

const requiredPaceText = (campaign) => {
  if (campaign.requiredPace === null) return "Campanha encerrada";
  if (campaign.requiredPace === 0) return "Meta batida";
  return perDay(campaign.requiredPace);
};

const gapText = (gap) => (gap > 0 ? formatCurrency(gap) : `Acima da meta em ${formatCurrency(-gap)}`);

const probabilityText = (probability) =>
  probability === null ? "Sem histórico suficiente" : formatApiPercent(probability);

const scenarioRows = (scenarios) => [
  ["Cenário", "Valor (R$)"],
  ...SCENARIOS.map((scenario) => [scenario.label, formatCsvNumber(scenarios[scenario.key])]),
];

// Cartões: os 3 cenários e a meta
export function ForecastScenarios({ segment }) {
  const { forecast } = useForecast(segment);
  const { campaign, goal } = forecast;
  const title = "Cenários da campanha";

  return (
    <ChartCard
      title={title}
      description={`Fechamento previsto em ${formatDay(campaign.end)}, com ${campaign.productiveDays.remaining} dias produtivos pela frente (${PRODUCTIVE_DAYS_NOTE})`}
      csvRows={[...scenarioRows(campaign.scenarios), ["Meta", formatCsvNumber(goal)], ["Vendido até agora", formatCsvNumber(campaign.sold)]]}
      segment={segment}
    >
      <ul className={styles.tiles} aria-label="Cenários">
        {SCENARIOS.map((scenario) => (
          <li key={scenario.key} className={`${styles.tile} ${scenario.key === "realistic" ? styles.tileMain : ""}`}>
            <span className={styles.tileLabel}>{scenario.label}</span>
            <strong className={styles.tileValue}>{formatCurrency(campaign.scenarios[scenario.key])}</strong>
            <span className={styles.tileNote}>
              {scenario.factor}
              {goal > 0 && ` · ${formatPercent(campaign.scenarios[scenario.key] / goal)} da meta`}
            </span>
          </li>
        ))}
        <li className={styles.tile}>
          <span className={styles.tileLabel}>{goalLabelOf(forecast, segment)}</span>
          <strong className={styles.tileValue}>{formatCurrency(goal)}</strong>
          <span className={styles.tileNote}>Vendido até agora: {formatCurrency(campaign.sold)}</span>
        </li>
      </ul>
    </ChartCard>
  );
}

// Ritmo atual x necessário, cobertura, gap e chance de bater a meta
export function ForecastIndicators({ segment }) {
  const { forecast } = useForecast(segment);
  const { campaign } = forecast;
  const title = "Indicadores do forecast";

  const facts = [
    { label: "Ritmo atual", value: perDay(campaign.pace.current), note: "Ritmo ponderado (7 dias, 30 dias e campanha)" },
    { label: "Ritmo necessário", value: requiredPaceText(campaign), note: "Quanto falta para a meta ÷ dias produtivos restantes" },
    {
      label: "Cobertura do ritmo",
      value: campaign.paceCoverage === null ? "—" : formatApiPercent(campaign.paceCoverage),
      note: "Quanto do ritmo necessário está sendo entregue. Não é a chance de bater a meta",
    },
    { label: "Gap previsto (realista)", value: gapText(campaign.gap), note: "Meta − cenário realista" },
    {
      label: "Chance de bater a meta",
      value: probabilityText(campaign.probability),
      note: "Estimativa estatística pela variação das vendas diárias",
    },
  ];

  return (
    <ChartCard
      title={title}
      description={`${goalLabelOf(forecast, segment)}: ${formatCurrency(forecast.goal)}`}
      csvRows={[["Indicador", "Valor"], ...facts.map((fact) => [fact.label, fact.value])]}
      segment={segment}
    >
      <dl className={styles.facts}>
        {facts.map((fact) => (
          <div key={fact.label} className={styles.fact}>
            <dt>{fact.label}</dt>
            <dd className={styles.factValue}>{fact.value}</dd>
            <dd className={styles.factNote}>{fact.note}</dd>
          </div>
        ))}
      </dl>
    </ChartCard>
  );
}

// Realizado até hoje e, daí em diante, as 3 trajetórias, com a meta como referência
export function ForecastTrajectoryChart({ segment }) {
  const { forecast } = useForecast(segment);
  const { trajectory, goal } = forecast;
  const title = "Trajetórias do forecast";
  const series = [
    { key: "actual", label: "Vendido", color: CHART_COLORS.blue, values: trajectory.actual },
    { key: "optimistic", label: "Otimista", color: CHART_COLORS.aqua, dashed: true, values: trajectory.optimistic },
    { key: "realistic", label: "Realista", color: CHART_COLORS.blue, dashed: true, values: trajectory.realistic },
    { key: "pessimistic", label: "Pessimista", color: CHART_COLORS.orange, dashed: true, values: trajectory.pessimistic },
  ];

  return (
    <ChartCard
      title={title}
      description={`Dias produtivos (${PRODUCTIVE_DAYS_NOTE}) de ${formatDay(forecast.campaign.start)} a ${formatDay(forecast.campaign.end)}`}
      csvRows={timeSeriesRows(trajectory.days, series, { formatLabel: formatDay })}
      segment={segment}
    >
      <TimeSeriesChart
        title={title}
        days={trajectory.days}
        series={series}
        reference={goal > 0 ? { value: goal, label: `Meta ${formatCompactCurrency(goal)}` } : undefined}
        formatValue={formatCurrency}
      />
    </ChartCard>
  );
}

// Como o ritmo é calculado: as 3 médias e os pesos
export function ForecastPace({ segment }) {
  const { forecast } = useForecast(segment);
  const { pace, productiveDays } = forecast.campaign;
  const title = "Como o ritmo é calculado";
  const parts = [
    { label: "Últimos 7 dias produtivos", average: pace.last7, weight: pace.weights.last7 },
    { label: "Últimos 30 dias produtivos", average: pace.last30, weight: pace.weights.last30 },
    { label: "Campanha inteira", average: pace.campaign, weight: pace.weights.campaign },
  ];

  return (
    <ChartCard
      title={title}
      description={`${productiveDays.elapsed} dias produtivos passados (dias sem venda contam como R$ 0) e ${productiveDays.remaining} pela frente`}
      csvRows={[
        ["Média", "Valor por dia (R$)", "Peso"],
        ...parts.map((part) => [part.label, formatCsvNumber(part.average), formatPercent(part.weight)]),
        ["Ritmo atual", formatCsvNumber(pace.current), ""],
      ]}
      segment={segment}
    >
      <table className={styles.paceTable}>
        <thead>
          <tr>
            <th scope="col">Média</th>
            <th scope="col">Por dia</th>
            <th scope="col">Peso</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr key={part.label}>
              <th scope="row">{part.label}</th>
              <td>{formatCurrency(part.average)}</td>
              <td>{formatPercent(part.weight)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Ritmo atual</th>
            <td colSpan={2}>{perDay(pace.current)}</td>
          </tr>
        </tfoot>
      </table>
    </ChartCard>
  );
}

// Semana atual (segunda a sábado): cenários e, quando o backend manda, a meta semanal automática
export function WeekForecast({ segment }) {
  const { forecast } = useForecast(segment);
  const { week, weekGoal } = forecast;
  const title = "Forecast da semana";
  const goalNote = weekGoal
    ? `Meta da semana: ${formatCurrency(weekGoal.goal)}`
    : "Não existe meta semanal: só a projeção";

  return (
    <ChartCard
      title={title}
      description={`${formatDay(week.start)} a ${formatDay(week.end)} · faltam ${week.remainingDays} dias produtivos. ${goalNote}`}
      csvRows={[
        ...scenarioRows(week.scenarios),
        ["Vendido na semana", formatCsvNumber(week.sold)],
        ...(weekGoal ? [["Meta da semana", formatCsvNumber(weekGoal.goal)]] : []),
      ]}
      segment={segment}
    >
      <ul className={styles.tiles} aria-label="Cenários da semana">
        <li className={styles.tile}>
          <span className={styles.tileLabel}>Vendido na semana</span>
          <strong className={styles.tileValue}>{formatCurrency(week.sold)}</strong>
        </li>
        {SCENARIOS.map((scenario) => (
          <li key={scenario.key} className={`${styles.tile} ${scenario.key === "realistic" ? styles.tileMain : ""}`}>
            <span className={styles.tileLabel}>{scenario.label}</span>
            <strong className={styles.tileValue}>{formatCurrency(week.scenarios[scenario.key])}</strong>
            <span className={styles.tileNote}>{scenario.factor}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

// Resumo para a tela Gráficos (a única previsão de lá: o antigo card de média simples saiu)
export function ForecastSummary({ segment }) {
  const { forecast } = useForecast(segment);
  const { campaign } = forecast;
  const title = "Forecast";

  const facts = [
    ["Ritmo atual", perDay(campaign.pace.current)],
    ["Ritmo necessário", requiredPaceText(campaign)],
    ["Cobertura do ritmo", campaign.paceCoverage === null ? "—" : formatApiPercent(campaign.paceCoverage)],
    ["Chance de bater a meta", probabilityText(campaign.probability)],
  ];

  return (
    <ChartCard
      title={title}
      description={`Ritmo ponderado (7 dias, 30 dias e campanha) até ${formatDay(campaign.end)}, só dias produtivos, sem o filtro de período`}
      csvRows={[...scenarioRows(campaign.scenarios), ...facts]}
      segment={segment}
    >
      <div className={styles.summary}>
        <div>
          <p className={styles.heroLabel}>Cenário realista</p>
          <p className={styles.hero}>{formatCurrency(campaign.scenarios.realistic)}</p>
          <p className={styles.range}>
            Entre {formatCurrency(campaign.scenarios.pessimistic)} (pessimista) e{" "}
            {formatCurrency(campaign.scenarios.optimistic)} (otimista)
          </p>
        </div>
        <dl className={styles.facts}>
          {facts.map(([label, value]) => (
            <div key={label} className={styles.fact}>
              <dt>{label}</dt>
              <dd className={styles.factValue}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </ChartCard>
  );
}
