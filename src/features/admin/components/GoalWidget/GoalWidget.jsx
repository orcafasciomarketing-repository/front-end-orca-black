import styles from "./GoalWidget.module.css";

import { Suspense } from "react";

import ErrorBoundary from "../../../../shared/components/ErrorBoundary/ErrorBoundary";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useGoal } from "../../hooks/useGoal";
import { useSectorCounts } from "../../hooks/useSectorCounts";
import { useSegmentTotal } from "../../hooks/useSegmentTotal";

const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const SECTOR_GROUPS = [
  { field: "sales", label: "Vendas", emptyText: "Nenhuma venda" },
  { field: "passages", label: "Passagens", emptyText: "Nenhuma passagem" },
  { field: "renewals", label: "Renovações", emptyText: "Nenhuma renovação" },
];

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
  const percent = goal.goal > 0 ? (total / goal.goal) * 100 : 0;
  const share = allSegments > 0 ? total / allSegments : 0;

  return (
    <GoalCard
      goal={goal.goal}
      total={total}
      percent={percent}
      segment={segment}
      note={`${segment} representa ${shareFormatter.format(share)} do total vendido`}
      reached={false}
    />
  );
}

function GoalCard({ goal, total, percent, segment, note, reached }) {
  const fillWidth = Math.min(Math.max(percent, 0), 100);

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Meta da Black Friday</h2>
        <span className={styles.percent}>{percentFormatter.format(percent)}%</span>
      </header>
      <div className={styles.body}>
        <div className={styles.progress}>
          <p className={styles.amounts}>
            {segment && <span className={styles.segment}>{segment}</span>}
            <strong className={styles.total}>{formatCurrency(total)}</strong>
            <span className={styles.goal}>
              de {formatCurrency(goal)}
              {segment && " (meta total)"}
            </span>
          </p>
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
