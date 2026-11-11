import styles from "../../goals/pages/GoalsPages.module.css";
import own from "./MyGoalsPage.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import PageHeader from "../../admin/components/PageHeader/PageHeader";
import { ChartCard } from "../../admin/components/SalesChartWidgets/SalesChartWidgets";
import WidgetFallback from "../../admin/components/WidgetFallback/WidgetFallback";
import GoalBreakdown from "../../goals/components/GoalBreakdown/GoalBreakdown";
import GoalEvolution from "../../goals/components/GoalEvolution/GoalEvolution";
import GoalForecastCard from "../../goals/components/GoalForecastCard/GoalForecastCard";
import MonthComparison from "../../goals/components/MonthComparison/MonthComparison";
import TierProgressCard from "../../goals/components/TierProgressCard/TierProgressCard";
import { currentMonthKey, formatMonth, formatShortDay, STATUS_LABELS, TIER_LABELS } from "../../goals/utils/goalMath";
import { useMyGoalHistory, useMyGoals } from "../hooks/useMe";

const TIER_CLASS = { goal: "tierGoal", super: "tierSuper", black: "tierBlack" };

const weekLabel = (week) => `Semana ${week.index + 1} · ${formatShortDay(week.start)} a ${formatShortDay(week.end)}`;

const pickMine = (item) => item.people[0] ?? { realized: 0, tiers: null };

export default function MyGoalsPage() {
  const [month, setMonth] = useState(() => currentMonthKey());

  return (
    <div className={styles.page}>
      <PageHeader title="Minhas metas" description="Quanto você já vendeu, quanto falta e a previsão para o mês">
        <label className={styles.field}>
          <span className={styles.label}>Mês</span>
          <input
            className={styles.input}
            type="month"
            value={month}
            aria-label="Mês das metas"
            onChange={(event) => /^\d{4}-\d{2}$/.test(event.target.value) && setMonth(event.target.value)}
          />
        </label>
      </PageHeader>
      <ErrorBoundary key={month} location="Minha área › minhas metas">
        <Suspense fallback={<WidgetFallback title="Minhas metas" />}>
          <MyGoalsContent month={month} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function MyGoalsContent({ month }) {
  const { goals } = useMyGoals(month);
  const person = goals.person;

  if (!person) {
    return (
      <section className="widget" aria-label="Minhas metas">
        <p className={styles.empty}>Você ainda não tem meta cadastrada para {formatMonth(month)}</p>
      </section>
    );
  }

  const weekIndex = person.weeks.findIndex((week) => goals.today >= week.start && goals.today <= week.end);
  const week = weekIndex >= 0 ? person.weeks[weekIndex] : null;
  const progress = { month: goals.month, days: goals.days, today: goals.today };
  const label = "Você";

  return (
    <>
      <Highlights goals={goals} person={person} week={week} />

      <section className={styles.segmentBlock} aria-label="Meu mês">
        <h2 className={styles.sectionTitle}>
          Mês <span className={styles.sectionPeriod}>{formatMonth(goals.month)}</span>
        </h2>
        <div className={styles.tierCards}>
          {person.month.available.map((tier) => (
            <TierProgressCard key={tier} tier={tier} progress={person.month} forecast={person.forecast} />
          ))}
          {person.forecast && (
            <div className={styles.wide}>
              <GoalForecastCard forecast={person.forecast} title="Minha previsão do mês" />
            </div>
          )}
          <div className={styles.wide}>
            <Suspense fallback={<WidgetFallback title="Comparação com o mês anterior" />}>
              <MonthComparison
                label={label}
                month={goals.month}
                scope={person}
                pickHistory={pickMine}
                useHistory={useMyGoalHistory}
              />
            </Suspense>
          </div>
        </div>
      </section>

      <GoalBreakdown person={person} week={week} />

      {week && (
        <section className={styles.segmentBlock} aria-label="Minha semana atual">
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

      <GoalEvolution
        label={label}
        scope={person}
        progress={progress}
        pickHistory={pickMine}
        useHistory={useMyGoalHistory}
      />

      <WeeksTable weeks={person.weeks} weekIndex={weekIndex} hasBlack={Boolean(goals.black?.active)} />
    </>
  );
}

function Highlights({ goals, person, week }) {
  const { month, forecast } = person;
  const current = month.current;
  const reachedAll = month.reached.length === month.available.length;
  const requiredPace = forecast?.tiers?.[current]?.requiredPace ?? null;
  const todayIndex = goals.days.indexOf(goals.today);
  const soldToday =
    todayIndex >= 0
      ? Math.round(
          ((person.cumulative[todayIndex] ?? 0) - (todayIndex > 0 ? person.cumulative[todayIndex - 1] : 0)) * 100,
        ) / 100
      : null;

  const tiles = [
    { label: "Vendido no mês", value: formatCurrency(month.realized), hint: `${STATUS_LABELS[month.pace.status]}` },
    {
      label: reachedAll ? "Todas as faixas batidas" : `Falta para a ${TIER_LABELS[current]}`,
      value: reachedAll ? formatCurrency(month.excess) : formatCurrency(month.remaining),
      hint: reachedAll ? "Além da última faixa" : `${TIER_LABELS[current]}: ${formatCurrency(month.target)}`,
    },
    {
      label: "Precisa vender por dia",
      value: reachedAll || requiredPace === null ? "—" : formatCurrency(requiredPace),
      hint: reachedAll ? "Faixas do mês batidas" : `Por dia útil que falta, para a ${TIER_LABELS[current]}`,
    },
    {
      label: "Meta da semana",
      value: week ? formatCurrency(week.tiers.goal) : "—",
      hint: week
        ? week.reached.includes("goal")
          ? `Batida, vendido ${formatCurrency(week.realized)}`
          : `Vendido ${formatCurrency(week.realized)} · faltam ${formatCurrency(week.tiers.goal - week.realized)}`
        : "Fora das semanas do mês",
    },
    {
      label: "Vendido hoje",
      value: soldToday === null ? "—" : formatCurrency(soldToday),
      hint: forecast ? `Ritmo atual: ${formatCurrency(forecast.pace.current)}/dia` : "",
    },
    {
      label: "Previsão realista",
      value: forecast ? formatCurrency(forecast.scenarios.realistic) : "—",
      hint: "Até o fim do mês, no ritmo atual",
    },
  ];

  return (
    <dl className={styles.tiles} aria-label="Resumo das minhas metas">
      {tiles.map((tile) => (
        <div key={tile.label} className={`widget ${styles.tile}`}>
          <dt className={styles.tileLabel}>{tile.label}</dt>
          <dd className={styles.tileValue}>{tile.value}</dd>
          {tile.hint && <dd className={own.tileHint}>{tile.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

function WeeksTable({ weeks, weekIndex, hasBlack }) {
  return (
    <ChartCard title="Minhas metas por semana" description="Meta, Super meta e Meta black de cada semana do mês">
      <div className={styles.scroll}>
        <table className={styles.table} aria-label="Minhas metas por semana">
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
              <th scope="col" className={styles.number}>
                Precisa por dia
              </th>
              <th scope="col">Faixa atual</th>
              <th scope="col">Situação</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((item) => (
              <tr key={item.start} className={item.index === weekIndex ? styles.selected : undefined}>
                <th scope="row">{weekLabel(item)}</th>
                <td className={styles.number}>{formatCurrency(item.tiers.goal)}</td>
                <td className={styles.number}>{formatCurrency(item.tiers.super)}</td>
                {hasBlack && <td className={styles.number}>{formatCurrency(item.tiers.black)}</td>}
                <td className={styles.number}>{formatCurrency(item.realized)}</td>
                <td className={styles.number}>
                  {item.pace.status === "done" || item.pace.daysToGo === 0
                    ? "—"
                    : formatCurrency(item.pace.neededPerDay)}
                </td>
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
  );
}
