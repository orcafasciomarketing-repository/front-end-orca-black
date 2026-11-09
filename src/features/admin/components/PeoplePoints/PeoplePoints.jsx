import styles from "./PeoplePoints.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../../shared/components/ErrorBoundary/ErrorBoundary";
import { usePeoplePoints } from "../../hooks/usePeoplePoints";
import { CHART_COLORS } from "../../utils/chartColors";
import { ALL_TEAMS, peoplePointsRows, rankPeople } from "../../utils/peoplePoints";
import Avatar from "../Avatar/Avatar";
import RankPeriodTabs from "../RankPeriodTabs/RankPeriodTabs";
import { ChartCard } from "../SalesChartWidgets/SalesChartWidgets";

const TITLE = "Pontos por pessoa";

const KINDS = [
  { key: "sales", label: "Venda", color: CHART_COLORS.blue },
  { key: "farm", label: "Renovação", color: CHART_COLORS.orange },
  { key: "passage", label: "Passagem", color: CHART_COLORS.aqua },
];

const formatPoints = (value) => `${value} ${value === 1 ? "ponto" : "pontos"}`;

function TeamSelect({ teams, value, onChange }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>Equipe</span>
      <select
        className={styles.select}
        aria-label="Filtrar pontos por equipe"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value={ALL_TEAMS}>Todas as equipes</option>
        {teams.map((team) => (
          <option key={String(team.teamId)} value={String(team.teamId)}>
            {team.teamName}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PeopleList({ people, label = TITLE }) {
  if (people.length === 0) {
    return <p className={styles.empty}>Nenhuma pessoa nesta equipe</p>;
  }

  const max = Math.max(0, ...people.map((person) => person.total));

  return (
    <div className={styles.points}>
      <ul className={styles.legend} aria-hidden="true">
        {KINDS.map((kind) => (
          <li key={kind.key} className={styles.legendItem}>
            <span className={styles.swatch} style={{ background: kind.color }} />
            {kind.label}
          </li>
        ))}
      </ul>
      <ol className={styles.rows} aria-label={label}>
        {people.map((person) => (
          <li key={person.key} className={`${styles.row} ${person.isMe ? styles.me : ""}`}>
            <span className={`${styles.position} ${styles[`position${person.position}`] ?? ""}`}>
              {person.position}º
            </span>
            <span className={styles.person}>
              <Avatar name={person.name} imageUrl={person.imageUrl} size="small" />
              <span className={styles.identity}>
                <span className={styles.name}>{person.name}</span>
                <span className={styles.detail}>
                  {person.isMe && <span className={styles.meTag}>Você · </span>}
                  {[person.teamName, person.job].filter(Boolean).join(" · ")}
                </span>
              </span>
            </span>
            <span className={styles.track}>
              <span
                className={styles.bar}
                style={{ width: max > 0 ? `${(person.total / max) * 100}%` : 0 }}
                aria-hidden="true"
              >
                {KINDS.map(
                  (kind) =>
                    person[kind.key] > 0 && (
                      <span
                        key={kind.key}
                        className={styles.segment}
                        style={{ flexGrow: person[kind.key], background: kind.color }}
                        title={`${kind.label}: ${formatPoints(person[kind.key])}`}
                      />
                    ),
                )}
              </span>
              <strong className={styles.total}>{formatPoints(person.total)}</strong>
              <span className={styles.srOnly}>
                {KINDS.map((kind) => `${kind.label.toLowerCase()} ${person[kind.key]}`).join(", ")}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DashboardPeople({ period, segment, teamId, onTeamChange }) {
  const { points } = usePeoplePoints({ period, segment });

  return (
    <>
      <div className={styles.toolbar}>
        <TeamSelect teams={points.teams} value={teamId} onChange={onTeamChange} />
      </div>
      <div className={styles.scroll}>
        <PeopleList people={rankPeople(points, teamId)} />
      </div>
    </>
  );
}

export function PeoplePointsWidget({ segment = "" }) {
  const [period, setPeriod] = useState("all");
  const [teamId, setTeamId] = useState(ALL_TEAMS);

  return (
    <section className="widget" aria-label={TITLE}>
      <header className="header">
        <h2 className="title">{TITLE}</h2>
      </header>
      <RankPeriodTabs value={period} onChange={setPeriod} label="Período dos pontos por pessoa" />
      <ErrorBoundary key={`${period}-${segment}`} location="Admin › pontos por pessoa">
        <Suspense fallback={<p className={styles.empty}>Carregando pontos...</p>}>
          <DashboardPeople period={period} segment={segment} teamId={teamId} onTeamChange={setTeamId} />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}

export function PeoplePointsChart({ period, segment }) {
  const [teamId, setTeamId] = useState(ALL_TEAMS);
  const { points } = usePeoplePoints({ segment, from: period?.start ?? "", to: period?.end ?? "" });
  const people = rankPeople(points, teamId);

  return (
    <ChartCard
      title={TITLE}
      description="Classificação de cada pessoa, com os pontos de venda, renovação e passagem"
      csvRows={peoplePointsRows(people)}
      period={period}
      segment={segment}
    >
      <div className={styles.cardToolbar}>
        <TeamSelect teams={points.teams} value={teamId} onChange={setTeamId} />
      </div>
      <div className={styles.cardScroll}>
        <PeopleList people={people} />
      </div>
    </ChartCard>
  );
}
