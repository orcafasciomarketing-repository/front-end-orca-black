import styles from "./GoalsPages.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import Avatar from "../../admin/components/Avatar/Avatar";
import TimeSeriesChart from "../../admin/components/charts/TimeSeriesChart";
import PageHeader from "../../admin/components/PageHeader/PageHeader";
import { ChartCard } from "../../admin/components/SalesChartWidgets/SalesChartWidgets";
import WidgetFallback from "../../admin/components/WidgetFallback/WidgetFallback";
import { CHART_COLORS } from "../../admin/utils/chartColors";
import { formatDay } from "../../admin/utils/chartData";
import GoalTierCard from "../components/GoalTierCard/GoalTierCard";
import { useGoalProgress } from "../hooks/useGoals";
import {
  currentMonthKey,
  formatMonth,
  formatShortDay,
  idealLine,
  STATUS_LABELS,
  TIER_LABELS,
  TYPE_LABELS,
  untilToday,
} from "../utils/goalMath";

const SEGMENT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "b2b", label: "B2B" },
  { value: "b2g", label: "B2G" },
];

const TIER_CLASS = { goal: "tierGoal", super: "tierSuper", black: "tierBlack" };
const TIER_COLORS = { goal: "var(--color-primary)", super: CHART_COLORS.aqua, black: "var(--color-text)" };

const formatPercent = (value) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const shareOfGoal = (progress) => (progress.tiers.goal > 0 ? (progress.realized / progress.tiers.goal) * 100 : 0);
const weekLabel = (week) => `Semana ${week.index + 1} · ${formatShortDay(week.start)} a ${formatShortDay(week.end)}`;

export default function GoalsProgressPage() {
  const [month, setMonth] = useState(() => currentMonthKey());
  const [segment, setSegment] = useState("");

  return (
    <div className={styles.page}>
      <PageHeader
        title="Metas por vendedor"
        description="Quão perto cada vendedor, setor e time está da Meta, da Super meta e da Meta black"
      >
        <label className={styles.field}>
          <span className={styles.label}>Mês</span>
          <input
            className={styles.input}
            type="month"
            value={month}
            aria-label="Mês do acompanhamento"
            onChange={(event) => /^\d{4}-\d{2}$/.test(event.target.value) && setMonth(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Setor</span>
          <select
            className={styles.select}
            value={segment}
            aria-label="Filtrar metas por setor"
            onChange={(event) => setSegment(event.target.value)}
          >
            {SEGMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </PageHeader>
      <ErrorBoundary key={month} location="Admin › metas por vendedor">
        <Suspense fallback={<WidgetFallback title="Metas do mês" />}>
          <ProgressContent month={month} segment={segment} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function ProgressContent({ month, segment }) {
  const { progress } = useGoalProgress(month);
  const [selectedId, setSelectedId] = useState(null);
  const segments = progress.segments.filter((item) => !segment || item.segment === segment);
  const people = progress.people.filter((person) => !segment || person.segment === segment);
  const weekIndex = progress.weeks.findIndex((week) => progress.today >= week.start && progress.today <= week.end);
  const selected = people.find((person) => person.vendorId === selectedId) ?? null;

  if (!segments.length) {
    return (
      <p className={styles.empty}>
        Nenhuma meta cadastrada em {formatMonth(month)}
        {segment ? ` para o ${segment.toUpperCase()}` : ""}. Cadastre na tela Cadastro de metas.
      </p>
    );
  }

  const count = (test) => people.filter(test).length;
  const tiles = [
    { label: "Vendedores com meta", value: people.length },
    { label: "Bateram a Meta", value: count((person) => person.month.reached.includes("goal")) },
    { label: "Bateram a Super meta", value: count((person) => person.month.reached.includes("super")) },
    ...(progress.black?.active
      ? [{ label: "Bateram a Meta black", value: count((person) => person.month.reached.includes("black")) }]
      : []),
    { label: "No ritmo", value: count((person) => ["ahead", "done"].includes(person.month.pace.status)) },
    { label: "Atrasados", value: count((person) => person.month.pace.status === "behind") },
  ];

  return (
    <>
      <dl className={styles.tiles} aria-label="Resumo das metas">
        {tiles.map((tile) => (
          <div key={tile.label} className={`widget ${styles.tile}`}>
            <dt className={styles.tileLabel}>{tile.label}</dt>
            <dd className={styles.tileValue}>{tile.value}</dd>
          </div>
        ))}
      </dl>

      {segments.map((item) => (
        <SegmentBlock key={item.segment} item={item} progress={progress} weekIndex={weekIndex} />
      ))}

      <ChartCard
        title="Quanto cada vendedor já fez da Meta do mês"
        description={`Barra = realizado ÷ Meta. As marcas mostram onde ficam a Meta (100%), a Super meta${progress.black?.active ? " e a Meta black" : ""}.`}
      >
        <TierBars people={people} onSelect={setSelectedId} />
      </ChartCard>

      <TeamsTable teams={segment ? null : progress.teams} />

      <ChartCard
        title="Vendedores"
        description="Clique no nome para ver o detalhe do vendedor"
        csvRows={vendorRows(people, Boolean(progress.black?.active))}
      >
        <VendorsTable people={people} selectedId={selectedId} onSelect={setSelectedId} />
      </ChartCard>

      {selected && <VendorDetail person={selected} progress={progress} weekIndex={weekIndex} />}
    </>
  );
}

function SegmentBlock({ item, progress, weekIndex }) {
  const label = item.segment.toUpperCase();
  const week = weekIndex >= 0 ? item.weeks[weekIndex] : null;
  const series = [
    {
      key: "realized",
      label: "Realizado",
      color: CHART_COLORS.blue,
      values: untilToday(item.cumulative, progress.days, progress.today),
    },
    {
      key: "ideal",
      label: "Ritmo da Meta",
      color: CHART_COLORS.rest,
      dashed: true,
      values: idealLine(item.goal, progress.days),
    },
  ];

  return (
    <section className={styles.segmentBlock} aria-label={`Setor ${label}`}>
      <h2 className={styles.sectionTitle}>Setor {label}</h2>
      <div className={styles.cards}>
        <GoalTierCard title={`Mês · ${label}`} period={formatMonth(progress.month)} progress={item.month} />
        {week ? (
          <GoalTierCard title={`Semana atual · ${label}`} period={weekLabel(week)} progress={week} />
        ) : (
          <p className={`widget ${styles.empty}`}>Hoje não está em nenhuma semana deste mês</p>
        )}
      </div>
      <dl className={styles.parts} aria-label={`Divisão do setor ${label}`}>
        {["farm", "sales"].map((type) => (
          <div key={type} className={styles.part}>
            <dt>
              {TYPE_LABELS[type]} ({type === "farm" ? item.farmPercent : 100 - item.farmPercent}%)
            </dt>
            <dd>
              {formatCurrency(item.parts[type].realized)} de {formatCurrency(item.parts[type].goal)}
            </dd>
          </div>
        ))}
      </dl>
      <ChartCard
        title={`Evolução do mês · ${label}`}
        description="Realizado acumulado comparado ao ritmo que bate a Meta no fim do mês"
      >
        <TimeSeriesChart
          title={`Evolução do mês do setor ${label}`}
          days={progress.days}
          series={series}
          reference={{ value: item.goal, label: `Meta ${formatCurrency(item.goal)}` }}
          formatValue={formatCurrency}
          formatLabel={formatDay}
        />
      </ChartCard>
    </section>
  );
}

const markersOf = (progress) =>
  progress.available
    .map((tier) => (progress.tiers.goal > 0 ? (progress.tiers[tier] / progress.tiers.goal) * 100 : 0))
    .filter((value) => value > 0);

function TierBars({ people, onSelect }) {
  const scale = Math.max(
    100,
    ...people.flatMap((person) => markersOf(person.month)),
    ...people.map((person) => shareOfGoal(person.month)),
  );

  if (!people.length) return <p className={styles.empty}>Nenhum vendedor com meta</p>;

  return (
    <>
      <ul className={styles.legend}>
        {Object.entries(TIER_LABELS)
          .filter(([tier]) => people.some((person) => person.month.available.includes(tier)))
          .map(([tier, label]) => (
            <li key={tier} className={styles.legendItem}>
              <span className={styles.swatch} style={{ background: TIER_COLORS[tier] }} />
              Buscando a {label}
            </li>
          ))}
      </ul>
      <ol className={styles.bars} aria-label="Percentual da Meta por vendedor">
        {people.map((person) => {
          const share = shareOfGoal(person.month);
          const markers = markersOf(person.month);
          return (
            <li key={person.vendorId} className={styles.barRow}>
              <span className={styles.person}>
                <Avatar name={person.name} imageUrl={person.imageUrl} size="small" />
                <span>
                  <button className={styles.rowButton} type="button" onClick={() => onSelect(person.vendorId)}>
                    {person.name}
                  </button>
                  <span className={styles.job}>{TIER_LABELS[person.month.current]}</span>
                </span>
              </span>
              <span className={styles.barTrack}>
                <span
                  className={styles.barFill}
                  style={{
                    width: `${Math.min(share / scale, 1) * 100}%`,
                    background: TIER_COLORS[person.month.current],
                  }}
                />
                {markers.map((marker) => (
                  <span key={marker} className={styles.marker} style={{ left: `${(marker / scale) * 100}%` }} />
                ))}
              </span>
              <span className={styles.barValue}>{formatPercent(share)}</span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function TeamsTable({ teams }) {
  if (!teams?.length) return null;

  return (
    <ChartCard title="Metas por time" description="Soma das metas e do realizado das pessoas de cada time">
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col" className={styles.number}>
                Pessoas
              </th>
              <th scope="col" className={styles.number}>
                Meta
              </th>
              <th scope="col" className={styles.number}>
                Realizado
              </th>
              <th scope="col">Faixa atual</th>
              <th scope="col" className={styles.number}>
                % da faixa
              </th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.teamId ?? "sem-time"}>
                <th scope="row">
                  <span className={styles.person}>
                    <Avatar name={team.teamName} imageUrl={team.imageUrl} size="small" />
                    <span className={styles.name}>{team.teamName}</span>
                  </span>
                </th>
                <td className={styles.number}>{team.members}</td>
                <td className={styles.number}>{formatCurrency(team.month.tiers.goal)}</td>
                <td className={styles.number}>{formatCurrency(team.month.realized)}</td>
                <td>
                  <span className={`${styles.tier} ${styles[TIER_CLASS[team.month.current]]}`}>
                    {TIER_LABELS[team.month.current]}
                  </span>
                </td>
                <td className={styles.number}>{formatPercent(team.month.percent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

function vendorRows(people, hasBlack) {
  return [
    ["Vendedor", "Setor", "Conta", "Nível", "Meta", "Super meta", "Meta black", "Realizado", "Faixa atual", "Situação"],
    ...people.map((person) => [
      person.name,
      person.segment.toUpperCase(),
      TYPE_LABELS[person.type],
      person.levelName,
      person.month.tiers.goal,
      person.month.tiers.super,
      hasBlack ? person.month.tiers.black : "",
      person.month.realized,
      TIER_LABELS[person.month.current],
      STATUS_LABELS[person.month.pace.status],
    ]),
  ];
}

function VendorsTable({ people, selectedId, onSelect }) {
  if (!people.length) return <p className={styles.empty}>Nenhum vendedor com meta</p>;

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Vendedor</th>
            <th scope="col">Conta</th>
            <th scope="col" className={styles.number}>
              Meta
            </th>
            <th scope="col" className={styles.number}>
              Realizado
            </th>
            <th scope="col">Faixa atual</th>
            <th scope="col" className={styles.number}>
              Falta
            </th>
            <th scope="col" className={styles.number}>
              Ritmo p/ Meta
            </th>
            <th scope="col" className={styles.number}>
              Projeção
            </th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => {
            const { month } = person;
            return (
              <tr key={person.vendorId} className={person.vendorId === selectedId ? styles.selected : undefined}>
                <th scope="row">
                  <span className={styles.person}>
                    <Avatar name={person.name} imageUrl={person.imageUrl} size="small" />
                    <span>
                      <button className={styles.rowButton} type="button" onClick={() => onSelect(person.vendorId)}>
                        {person.name}
                      </button>
                      <span className={styles.job}>
                        {[person.levelName, person.segment.toUpperCase(), person.teamName].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </span>
                </th>
                <td>{TYPE_LABELS[person.type]}</td>
                <td className={styles.number}>{formatCurrency(month.tiers.goal)}</td>
                <td className={styles.number}>{formatCurrency(month.realized)}</td>
                <td>
                  <span className={`${styles.tier} ${styles[TIER_CLASS[month.current]]}`}>
                    {TIER_LABELS[month.current]}
                  </span>
                </td>
                <td className={styles.number}>
                  {month.reached.length === month.available.length && month.available.length > 0
                    ? `+${formatCurrency(month.excess)}`
                    : formatCurrency(month.remaining)}
                </td>
                <td className={styles.number}>
                  {month.pace.status === "done" || month.pace.remainingDays === 0
                    ? "—"
                    : `${formatCurrency(month.pace.neededPerDay)}/dia`}
                </td>
                <td className={styles.number}>
                  {month.pace.elapsedDays > 0 ? formatCurrency(month.pace.projection) : "—"}
                </td>
                <td className={`${styles.status} ${styles[month.pace.status]}`}>{STATUS_LABELS[month.pace.status]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VendorDetail({ person, progress, weekIndex }) {
  const hasBlack = Boolean(progress.black?.active);
  const week = weekIndex >= 0 ? person.weeks[weekIndex] : null;
  const series = [
    {
      key: "realized",
      label: "Realizado",
      color: CHART_COLORS.blue,
      values: untilToday(person.cumulative, progress.days, progress.today),
    },
    {
      key: "ideal",
      label: "Ritmo da Meta",
      color: CHART_COLORS.rest,
      dashed: true,
      values: idealLine(person.month.tiers.goal, progress.days),
    },
  ];

  return (
    <section className={`widget ${styles.detail}`} aria-label={`Detalhe de ${person.name}`}>
      <header className="header">
        <span className={styles.detailHeader}>
          <Avatar name={person.name} imageUrl={person.imageUrl} />
          <span>
            <h2 className="title">{person.name}</h2>
            <span className={styles.job}>
              {[person.job, person.levelName, person.teamName].filter(Boolean).join(" · ")} · conta{" "}
              {TYPE_LABELS[person.type].toLowerCase()}
            </span>
          </span>
        </span>
      </header>
      <div className={styles.detailBody}>
        <div className={styles.cards}>
          <GoalTierCard title="Mês" period={formatMonth(progress.month)} progress={person.month} />
          {week && <GoalTierCard title="Semana atual" period={weekLabel(week)} progress={week} />}
        </div>
        <div className={styles.scroll}>
          <table className={styles.table} aria-label={`Semanas de ${person.name}`}>
            <thead>
              <tr>
                <th scope="col">Semana</th>
                <th scope="col" className={styles.number}>
                  Meta
                </th>
                <th scope="col" className={styles.number}>
                  Super meta
                </th>
                {hasBlack && (
                  <th scope="col" className={styles.number}>
                    Meta black
                  </th>
                )}
                <th scope="col" className={styles.number}>
                  Realizado
                </th>
                <th scope="col">Faixa atual</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {person.weeks.map((item) => (
                <tr key={item.start} className={item.index === weekIndex ? styles.selected : undefined}>
                  <th scope="row">{weekLabel(item)}</th>
                  <td className={styles.number}>{formatCurrency(item.tiers.goal)}</td>
                  <td className={styles.number}>{formatCurrency(item.tiers.super)}</td>
                  {hasBlack && <td className={styles.number}>{formatCurrency(item.tiers.black)}</td>}
                  <td className={styles.number}>{formatCurrency(item.realized)}</td>
                  <td>
                    <span className={`${styles.tier} ${styles[TIER_CLASS[item.current]]}`}>
                      {TIER_LABELS[item.current]}
                    </span>
                  </td>
                  <td className={`${styles.status} ${styles[item.pace.status]}`}>{STATUS_LABELS[item.pace.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TimeSeriesChart
          title={`Evolução do mês de ${person.name}`}
          days={progress.days}
          series={series}
          reference={{ value: person.month.tiers.goal, label: `Meta ${formatCurrency(person.month.tiers.goal)}` }}
          formatValue={formatCurrency}
          formatLabel={formatDay}
        />
      </div>
    </section>
  );
}
