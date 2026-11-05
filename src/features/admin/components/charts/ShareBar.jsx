import styles from "./ShareBar.module.css";

import { formatPercent } from "../../utils/chartScale";

export default function ShareBar({ title, items, formatValue }) {
  return (
    <div className={styles.share}>
      <div className={styles.bar} aria-hidden="true">
        {items.map(
          (item) =>
            item.share > 0 && (
              <span
                key={item.key}
                className={styles.segment}
                style={{ flexGrow: item.share, background: item.color }}
                title={`${item.label}: ${formatPercent(item.share)}`}
              />
            ),
        )}
      </div>
      <ul className={styles.legend} aria-label={title}>
        {items.map((item) => (
          <li key={item.key} className={styles.item}>
            <span className={styles.swatch} style={{ background: item.color }} />
            <span className={styles.label}>{item.label}</span>
            <strong className={styles.percent}>{formatPercent(item.share)}</strong>
            <span className={styles.value}>{formatValue(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
