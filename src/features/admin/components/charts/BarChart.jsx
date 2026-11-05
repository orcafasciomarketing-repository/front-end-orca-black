import styles from "./BarChart.module.css";

export default function BarChart({ title, items, color, formatValue }) {
  const maxValue = Math.max(...items.map((item) => item.value), 0);

  return (
    <ol className={styles.bars} aria-label={title}>
      {items.map((item) => (
        <li key={item.key} className={styles.row}>
          <span className={styles.label}>
            <span className={styles.name}>{item.label}</span>
            {item.detail && <span className={styles.detail}>{item.detail}</span>}
          </span>
          <span className={styles.track}>
            <span
              className={styles.bar}
              style={{ width: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : 0, background: color }}
            />
            <span className={styles.value}>{formatValue(item.value)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
