import styles from "./RankPeriodTabs.module.css";

import { RANK_PERIODS } from "../../utils/rankMovement";

export default function RankPeriodTabs({ value, onChange, label }) {
  return (
    <div className={styles.periods} role="group" aria-label={label}>
      {RANK_PERIODS.map((period) => (
        <button
          key={period.value}
          className={`${styles.period} ${period.value === value ? styles.periodActive : ""}`}
          type="button"
          aria-pressed={period.value === value}
          onClick={() => onChange(period.value)}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
