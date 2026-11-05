import styles from "./GoalWidget.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useGoal } from "../../hooks/useGoal";

const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

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
    </section>
  );
}
