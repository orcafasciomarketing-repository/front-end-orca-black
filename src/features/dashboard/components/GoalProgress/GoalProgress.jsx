import styles from "./GoalProgress.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";

export default function GoalProgress({ total, goal, percent }) {
  const fillWidth = Math.min(Math.max(percent, 0), 100);

  return (
    <div className={styles.progress}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fillWidth}
      >
        <div className={styles.fill} style={{ width: `${fillWidth}%` }} />
      </div>
      <div className={styles.values}>
        <span>{formatCurrency(total)}</span>
        <span>{formatCurrency(goal)}</span>
      </div>
    </div>
  );
}
