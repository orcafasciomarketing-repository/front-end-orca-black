import styles from "./GoalWidget.module.css";

import { Suspense, useEffect, useRef, useState } from "react";

import ErrorBoundary from "../../../../shared/components/ErrorBoundary/ErrorBoundary";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useForecast } from "../../hooks/useForecast";
import { useGoal } from "../../hooks/useGoal";
import { useSectorCounts } from "../../hooks/useSectorCounts";
import { useSegmentTotal } from "../../hooks/useSegmentTotal";
import { getSegmentGoal } from "../../utils/segments";

const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const SECTOR_GROUPS = [
  { field: "sales", label: "Vendas", emptyText: "Nenhuma venda" },
  { field: "passages", label: "Passagens", emptyText: "Nenhuma passagem" },
  { field: "renewals", label: "Renovações", emptyText: "Nenhuma renovação" },
];

const MILESTONES = [25, 50, 75, 100];
export const CELEBRATION_MS = 6000;

const milestoneOf = (percent) => MILESTONES.filter((milestone) => percent >= milestone).at(-1) ?? 0;

const shareFormatter = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

export default function GoalWidget({ segment = "" }) {
  const { goal } = useGoal();

  if (segment) {
    return <SegmentGoal goal={goal} segment={segment} />;
  }

  const remaining = Math.max(goal.goal - goal.total, 0);

  return (
    <GoalCard
      goal={goal.goal}
      total={goal.total}
      percent={goal.percent}
      segment=""
      note={remaining === 0 ? "Meta batida!" : `Faltam ${formatCurrency(remaining)}`}
      reached={remaining === 0}
    />
  );
}

function SegmentGoal({ goal, segment }) {
  const { total, allSegments } = useSegmentTotal(segment);
  const segmentGoal = getSegmentGoal(goal, segment);
  const percent = segmentGoal.value > 0 ? (total / segmentGoal.value) * 100 : 0;
  const share = allSegments > 0 ? total / allSegments : 0;
  const shareNote = `${segment} representa ${shareFormatter.format(share)} do total vendido`;

  // Sem meta do setor: compara com a meta total e mostra a participação, como antes
  if (segmentGoal.isTotal) {
    return (
      <GoalCard
        goal={goal.goal}
        total={total}
        percent={percent}
        segment={segment}
        note={shareNote}
        reached={false}
        isTotalGoal
      />
    );
  }

  const remaining = Math.max(segmentGoal.value - total, 0);
  const remainingNote = remaining === 0 ? "Meta batida!" : `Faltam ${formatCurrency(remaining)}`;
  // Quem só enxerga o próprio setor (b2b/b2g) teria sempre 100%: aí a participação não aparece
  const note = allSegments > total ? `${remainingNote} · ${shareNote}` : remainingNote;

  return (
    <GoalCard
      goal={segmentGoal.value}
      total={total}
      percent={percent}
      segment={segment}
      note={note}
      reached={remaining === 0}
    />
  );
}

function ExpectedPace({ segment, goal }) {
  const { forecast } = useForecast(segment);
  const { elapsed, remaining } = forecast.campaign.productiveDays;
  const ratio = elapsed + remaining > 0 ? elapsed / (elapsed + remaining) : 0;

  if (ratio <= 0 || ratio >= 1) {
    return null;
  }

  const label = `Hoje deveria estar em ${formatCurrency(goal * ratio)} (${percentFormatter.format(ratio * 100)}%)`;

  return (
    <span className={styles.expected} style={{ left: `${ratio * 100}%` }} title={label}>
      <span className={styles.expectedLabel} style={{ transform: `translateX(-${ratio * 100}%)` }}>
        {label}
      </span>
    </span>
  );
}

function Celebration({ percent }) {
  const previous = useRef(null);
  const [milestone, setMilestone] = useState(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = percent;

    if (before === null || milestoneOf(percent) <= milestoneOf(before)) {
      return undefined;
    }

    setMilestone(milestoneOf(percent));
    const timer = setTimeout(() => setMilestone(null), CELEBRATION_MS);
    return () => clearTimeout(timer);
  }, [percent]);

  return (
    <span className={styles.celebrationArea} role="status">
      {milestone && (
        <span className={styles.celebration}>
          <span aria-hidden="true">🎉 </span>
          {milestone === 100 ? "Meta batida!" : `${milestone}% da meta alcançados!`}
        </span>
      )}
    </span>
  );
}

function GoalCard({ goal, total, percent, segment, note, reached, isTotalGoal = false }) {
  const fillWidth = Math.min(Math.max(percent, 0), 100);

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Meta da campanha</h2>
        <Celebration percent={percent} />
        <span className={styles.percent}>{percentFormatter.format(percent)}%</span>
      </header>
      <div className={styles.body}>
        <div className={styles.progress}>
          <p className={styles.amounts}>
            {segment && <span className={styles.segment}>{segment}</span>}
            <strong className={styles.total}>{formatCurrency(total)}</strong>
            <span className={styles.goal}>
              de {formatCurrency(goal)}
              {segment && (isTotalGoal ? " (meta total)" : ` (meta ${segment})`)}
            </span>
          </p>
          <div className={styles.trackArea}>
            <div
              className={styles.track}
              role="progressbar"
              aria-label="Progresso da meta"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={fillWidth}
            >
              <div className={styles.fill} style={{ width: `${fillWidth}%` }} />
            </div>
            {MILESTONES.slice(0, -1).map((milestone) => (
              <span
                key={milestone}
                className={`${styles.milestone} ${fillWidth >= milestone ? styles.milestoneDone : ""}`}
                style={{ left: `${milestone}%` }}
                aria-hidden="true"
              />
            ))}
            <ErrorBoundary location="Admin › meta (ritmo esperado)" fallback={null}>
              <Suspense fallback={null}>
                <ExpectedPace segment={segment} goal={goal} />
              </Suspense>
            </ErrorBoundary>
          </div>
          <p className={`${styles.remaining} ${reached ? styles.reached : ""}`}>{note}</p>
        </div>
        <span className={styles.divider} aria-hidden="true" />
        <ErrorBoundary location="Admin › meta (setores)">
          <Suspense fallback={<p className={styles.loading}>Carregando setores...</p>}>
            <SectorSummary segment={segment} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </section>
  );
}

function SectorSummary({ segment }) {
  const { counts } = useSectorCounts(segment);

  return (
    <div className={styles.sectors}>
      {SECTOR_GROUPS.map((group) => (
        <section key={group.field} className={styles.group} aria-label={`${group.label} por setor`}>
          <h3 className={styles.groupTitle}>{group.label}</h3>
          {counts[group.field].length === 0 ? (
            <p className={styles.groupEmpty}>{group.emptyText}</p>
          ) : (
            <ul className={styles.groupList}>
              {counts[group.field].map((item) => (
                <li key={item.sector} className={styles.groupItem}>
                  <span className={styles.sector}>{item.sector}</span>
                  <strong className={styles.count}>{item.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
