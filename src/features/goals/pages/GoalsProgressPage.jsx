import styles from "./GoalsPages.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import Avatar from "../../admin/components/Avatar/Avatar";
import PageHeader from "../../admin/components/PageHeader/PageHeader";
import { ChartCard } from "../../admin/components/SalesChartWidgets/SalesChartWidgets";
import WidgetFallback from "../../admin/components/WidgetFallback/WidgetFallback";
import { CHART_COLORS } from "../../admin/utils/chartColors";
import GoalEvolution from "../components/GoalEvolution/GoalEvolution";
import GoalForecastCard from "../components/GoalForecastCard/GoalForecastCard";
import TierProgressCard from "../components/TierProgressCard/TierProgressCard";
import { useGoalProgress } from "../hooks/useGoals";
import {
  currentMonthKey,
  formatMonth,
  formatShortDay,
  STATUS_LABELS,
  TIER_LABELS,
  TYPE_LABELS,
} from "../utils/goalMath";

const SEGMENT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "b2b", label: "B2B" },
  { value: "b2g", label: "B2G" },
];

const VIEW_OPTIONS = [
  { value: "total", label: "Total" },
  { value: "vendor", label: "Por vendedor" },
];

const PART_LABELS = { farm: "Farmer", sales: "Venda" };

const TYPE_NOTES = {
  farm: "Conta Farmer: só as renovações contam para a meta",
  sales: "Conta Venda: só as vendas novas contam para a meta",
};

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
  const [view, setView] = useState("total");
  const [selectedId, setSelectedId] = useState(null);
  const segments = progress.segments.filter((item) => !segment || item.segment === segment);
  const people = progress.people.filter((person) => !segment || person.segment === segment);
  const weekIndex = progress.weeks.findIndex((week) => progress.today >= week.start && progress.today <= week.end);
  const selected = people.find((person) => person.vendorId === selectedId) ?? people[0] ?? null;

  if (!segments.length) {
    return (
      <p className={styles.empty}>
        Nenhuma meta cadastrada em {formatMonth(month)}
        {segment ? ` para o ${segment.toUpperCase()}` : ""}. Cadastre na tela Cadastro de metas.
      </p>
    );
  }

  const openVendor = (vendorId) => {
    setSelectedId(vendorId);
    setView("vendor");
  };

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Ver os dados">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`${styles.tab} ${option.value === view ? styles.tabActive : ""}`}
              type="button"
              aria-pressed={option.value === view}
              onClick={() => setView(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {view === "vendor" && selected && (
          <label className={styles.field}>
            <span className={styles.label}>Vendedor</span>
            <select
              className={styles.select}
              value={selected.vendorId}
              aria-label="Escolher vendedor"
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {[...people]
                .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
                .map((person) => (
                  <option key={person.vendorId} value={person.vendorId}>
                    {person.name} · {person.segment.toUpperCase()} · {PART_LABELS[person.type]}
                  </option>
                ))}
            </select>
          </label>
        )}
      </div>

      {view === "total" ? (
        <TotalView
          progress={progress}
          segment={segment}
          segments={segments}
          people={people}
          weekIndex={weekIndex}
          onSelect={openVendor}
        />
      ) : selected ? (
        <VendorView key={selected.vendorId} person={selected} progress={progress} weekIndex={weekIndex} />
      ) : (
        <p className={styles.empty}>Nenhum vendedor com meta</p>
      )}
    </>
  );
}

function SummaryTiles({ people, hasBlack }) {
  const count = (test) => people.filter(test).length;
  const tiles = [
    { label: "Vendedores com meta", value: people.length },
    { label: "Bateram a Meta", value: count((person) => person.month.reached.includes("goal")) },
    { label: "Bateram a Super meta", value: count((person) => person.month.reached.includes("super")) },
    ...(hasBlack
      ? [{ label: "Bateram a Meta black", value: count((person) => person.month.reached.includes("black")) }]
      : []),
    { label: "No ritmo", value: count((person) => ["ahead", "done"].includes(person.month.pace.status)) },
    { label: "Atrasados", value: count((person) => person.month.pace.status === "behind") },
  ];

  return (
    <dl className={styles.tiles} aria-label="Resumo das metas">
      {tiles.map((tile) => (
        <div key={tile.label} className={`widget ${styles.tile}`}>
          <dt className={styles.tileLabel}>{tile.label}</dt>
          <dd className={styles.tileValue}>{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ScopeOverview({ label, scope, weekIndex }) {
  const week = weekIndex >= 0 ? scope.weeks[weekIndex] : null;

  return (
    <>
      <section className={styles.segmentBlock} aria-label={`Mês · ${label}`}>
        <h2 className={styles.sectionTitle}>Mês · {label}</h2>
        <div className={styles.tierCards}>
          {scope.month.available.map((tier) => (
            <TierProgressCard key={tier} tier={tier} progress={scope.month} forecast={scope.forecast} />
          ))}
        </div>
        {scope.forecast && <GoalForecastCard forecast={scope.forecast} title={`Previsão do mês · ${label}`} />}
      </section>
      {week && (
        <section className={styles.segmentBlock} aria-label={`Semana atual · ${label}`}>
          <h2 className={styles.sectionTitle}>
            Semana atual <span className={styles.sectionPeriod}>{weekLabel(week)}</span>
          </h2>
          <div className={styles.tierCards}>
            {week.available.map((tier) => (
              <TierProgressCard key={tier} tier={tier} progress={week} period="semana atual" />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function TotalView({ progress, segment, segments, people, weekIndex, onSelect }) {
  const hasBlack = Boolean(progress.black?.active);
  const scope = segment ? segments[0] : (progress.total ?? segments[0]);
  const label = segment ? `Setor ${segment.toUpperCase()}` : "Total";
  const rows = [
    ...(segment
      ? []
      : segments.map((item) => ({
          key: item.segment,
          label: `Setor ${item.segment.toUpperCase()}`,
          progress: item.month,
        }))),
    ...["farm", "sales"].map((type) => ({ key: type, label: PART_LABELS[type], progress: scope.parts[type] })),
  ];

  return (
    <>
      <SummaryTiles people={people} hasBlack={hasBlack} />
      <ScopeOverview label={label} scope={scope} weekIndex={weekIndex} />
      <TierTable
        title={segment ? `Farmer e Venda · ${label}` : "Setores, Farmer e Venda"}
        rows={rows}
        hasBlack={hasBlack}
      />
      <GoalEvolution
        label={label}
        scope={scope}
        progress={progress}
        pickHistory={(item) => (segment ? item.segments[segment] : item.total)}
      />

      <ChartCard
        title="Quanto cada vendedor já fez da Meta do mês"
        description={`Barra = realizado ÷ Meta. As marcas mostram onde ficam a Meta (100%), a Super meta${hasBlack ? " e a Meta black" : ""}. Clique no nome para ver o vendedor.`}
      >
        <TierBars people={people} onSelect={onSelect} />
      </ChartCard>

      <TeamsTable teams={segment ? null : progress.teams} />

      <ChartCard
        title="Vendedores"
        description="Clique no nome para ver o vendedor"
        csvRows={vendorRows(people, hasBlack)}
      >
        <VendorsTable people={people} onSelect={onSelect} />
      </ChartCard>
    </>
  );
}

function VendorView({ person, progress, weekIndex }) {
  const hasBlack = Boolean(progress.black?.active);
  const label = person.name;

  return (
    <>
      <section className={`widget ${styles.vendorCard}`} aria-label={`Vendedor ${person.name}`}>
        <Avatar name={person.name} imageUrl={person.imageUrl} />
        <span className={styles.vendorInfo}>
          <h2 className="title">{person.name}</h2>
          <span className={styles.job}>
            {[person.job, person.levelName, person.segment.toUpperCase(), person.teamName].filter(Boolean).join(" · ")}
          </span>
          <span className={styles.vendorNote}>{TYPE_NOTES[person.type]}</span>
        </span>
        <span className={`${styles.status} ${styles.vendorStatus} ${styles[person.month.pace.status]}`}>
          {STATUS_LABELS[person.month.pace.status]}
        </span>
      </section>

      <ScopeOverview label={label} scope={person} weekIndex={weekIndex} />

      <GoalEvolution
        label={label}
        scope={person}
        progress={progress}
        pickHistory={(item) =>
          item.people.find((entry) => entry.vendorId === person.vendorId) ?? { realized: 0, tiers: null }
        }
      />

      <ChartCard title={`Semanas de ${person.name}`} description="Meta, Super meta e Meta black de cada semana do mês">
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
      </ChartCard>
    </>
  );
}

function TierTable({ title, rows, hasBlack }) {
  const tiers = hasBlack ? ["goal", "super", "black"] : ["goal", "super"];

  return (
    <ChartCard title={title} description="Realizado de cada parte e quanto dele já cobre cada faixa">
      <div className={styles.scroll}>
        <table className={styles.table} aria-label={title}>
          <thead>
            <tr>
              <th scope="col">Parte</th>
              <th scope="col" className={styles.number}>
                Realizado
              </th>
              {tiers.map((tier) => (
                <th key={tier} scope="col" className={styles.number}>
                  {TIER_LABELS[tier]}
                </th>
              ))}
              <th scope="col">Faixa atual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td className={styles.number}>{formatCurrency(row.progress.realized)}</td>
                {tiers.map((tier) => (
                  <td key={tier} className={styles.number}>
                    {row.progress.tiers[tier] > 0 ? (
                      <>
                        {formatPercent((row.progress.realized / row.progress.tiers[tier]) * 100)}
                        <span className={styles.job}>de {formatCurrency(row.progress.tiers[tier])}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
                <td>
                  <span className={`${styles.tier} ${styles[TIER_CLASS[row.progress.current]]}`}>
                    {TIER_LABELS[row.progress.current]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
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

function VendorsTable({ people, onSelect }) {
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
              Chance da Meta
            </th>
            <th scope="col" className={styles.number}>
              Previsão realista
            </th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => {
            const { month, forecast } = person;
            const chance = forecast?.tiers?.goal?.probability;
            return (
              <tr key={person.vendorId}>
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
                  {chance === null || chance === undefined ? "—" : formatPercent(chance)}
                </td>
                <td className={styles.number}>{forecast ? formatCurrency(forecast.scenarios.realistic) : "—"}</td>
                <td className={`${styles.status} ${styles[month.pace.status]}`}>{STATUS_LABELS[month.pace.status]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
