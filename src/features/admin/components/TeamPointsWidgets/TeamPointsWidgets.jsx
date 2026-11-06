import styles from "./TeamPointsWidgets.module.css";

import { usePointsHistory } from "../../hooks/usePointsHistory";
import { CHART_COLORS } from "../../utils/chartColors";
import { formatDay } from "../../utils/chartData";
import { cumulativeTeamPoints, summarizeTeamPoints } from "../../utils/teamPoints";
import { timeSeriesRows } from "../../utils/tableCsv";
import Avatar from "../Avatar/Avatar";
import TimeSeriesChart from "../charts/TimeSeriesChart";
import { ChartCard } from "../SalesChartWidgets/SalesChartWidgets";

const KINDS = [
  { key: "sales", label: "Venda", color: CHART_COLORS.blue },
  { key: "farm", label: "Renovação", color: CHART_COLORS.orange },
  { key: "passage", label: "Passagem", color: CHART_COLORS.aqua },
];

const TEAM_COLORS = [CHART_COLORS.blue, CHART_COLORS.orange, CHART_COLORS.aqua];

const formatPoints = (value) => `${value} ${value === 1 ? "ponto" : "pontos"}`;

export function TeamPointsChart({ period, segment }) {
  const { history } = usePointsHistory(segment);
  const teams = summarizeTeamPoints(history, period);
  const max = Math.max(0, ...teams.map((team) => team.total));
  const title = "Pontos por equipe";

  return (
    <ChartCard
      title={title}
      description="Pontos da competição, separados em venda, renovação e passagem"
      csvRows={[
        ["Equipe", ...KINDS.map((kind) => kind.label), "Total"],
        ...teams.map((team) => [team.label, ...KINDS.map((kind) => String(team[kind.key])), String(team.total)]),
      ]}
      period={period}
      segment={segment}
    >
      {teams.length === 0 ? (
        <p className={styles.empty}>Nenhuma equipe cadastrada</p>
      ) : (
        <div className={styles.points}>
          <ul className={styles.legend} aria-hidden="true">
            {KINDS.map((kind) => (
              <li key={kind.key} className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: kind.color }} />
                {kind.label}
              </li>
            ))}
          </ul>
          <ol className={styles.rows} aria-label={title}>
            {teams.map((team) => (
              <li key={team.key} className={styles.row}>
                <span className={styles.team}>
                  <Avatar name={team.label} imageUrl={team.imageUrl} size="small" />
                  <span className={styles.name}>{team.label}</span>
                </span>
                <span className={styles.track}>
                  <span
                    className={styles.bar}
                    style={{ width: max > 0 ? `${(team.total / max) * 100}%` : 0 }}
                    aria-hidden="true"
                  >
                    {KINDS.map(
                      (kind) =>
                        team[kind.key] > 0 && (
                          <span
                            key={kind.key}
                            className={styles.segment}
                            style={{ flexGrow: team[kind.key], background: kind.color }}
                            title={`${kind.label}: ${formatPoints(team[kind.key])}`}
                          />
                        ),
                    )}
                  </span>
                  <strong className={styles.total}>{formatPoints(team.total)}</strong>
                  <span className={styles.srOnly}>
                    {KINDS.map((kind) => `${kind.label.toLowerCase()} ${team[kind.key]}`).join(", ")}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </ChartCard>
  );
}

export function TeamPointsEvolution({ period, segment }) {
  const { history } = usePointsHistory(segment);
  const evolution = cumulativeTeamPoints(history, period);
  const title = "Evolução dos pontos";
  const series = evolution.teams.map((team, index) => ({
    ...team,
    color: TEAM_COLORS[index] ?? CHART_COLORS.rest,
  }));

  return (
    <ChartCard
      title={title}
      description="Pontos de cada equipe somados dia a dia"
      csvRows={timeSeriesRows(evolution.days, series, { formatLabel: formatDay })}
      period={period}
      segment={segment}
    >
      {evolution.days.length === 0 ? (
        <p className={styles.empty}>Nenhum ponto no período</p>
      ) : (
        <TimeSeriesChart title={title} days={evolution.days} series={series} formatValue={formatPoints} />
      )}
    </ChartCard>
  );
}
