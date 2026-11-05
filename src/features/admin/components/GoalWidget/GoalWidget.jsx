import styles from "./GoalWidget.module.css";

import { Suspense } from "react";

import ErrorBoundary from "../../../../shared/components/ErrorBoundary/ErrorBoundary";
import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useGoal } from "../../hooks/useGoal";
import { useSectorCounts } from "../../hooks/useSectorCounts";

const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const SECTOR_GROUPS = [
  { field: "sales", label: "Vendas", emptyText: "Nenhuma venda" },
  { field: "passages", label: "Passagens", emptyText: "Nenhuma passagem" },
  { field: "renewals", label: "Renovações", emptyText: "Nenhuma renovação" },
];

export default function GoalWidget() {
  const { goal } = useGoal();
  const fillWidth = Math.min(Math.max(goal.percent, 0), 100);
  const remaining = Math.max(goal.goal - goal.total, 0);

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Meta da Black Friday</h2>
        <span className={styles.percent}>{percentFormatter.format(goal.percent)}%</span>
      </header>
      <div className={styles.body}>
        <div className={styles.progress}>
          <p className={styles.amounts}>
            <strong className={styles.total}>{formatCurrency(goal.total)}</strong>
            <span className={styles.goal}>de {formatCurrency(goal.goal)}</span>
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
          <p className={`${styles.remaining} ${remaining === 0 ? styles.reached : ""}`}>
            {remaining === 0 ? "Meta batida!" : `Faltam ${formatCurrency(remaining)}`}
          </p>
        </div>
        <span className={styles.divider} aria-hidden="true" />
        <ErrorBoundary location="Admin › meta (setores)">
          <Suspense fallback={<p className={styles.loading}>Carregando setores...</p>}>
            <SectorSummary />
          </Suspense>
        </ErrorBoundary>
      </div>
    </section>
  );
}

function SectorSummary() {
  const { counts } = useSectorCounts();

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
