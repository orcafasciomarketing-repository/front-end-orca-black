import styles from "./BarChart.module.css";

import Avatar from "../Avatar/Avatar";

export default function BarChart({ title, items, color, formatValue, showAvatar = false, onSelect }) {
  const maxValue = Math.max(...items.map((item) => item.value), 0);

  return (
    <ol className={styles.bars} aria-label={title}>
      {items.map((item) => (
        <li key={item.key} className={styles.row}>
          <span className={styles.person}>
            {showAvatar && <Avatar name={item.label} imageUrl={item.imageUrl} size="small" />}
            <span className={styles.label}>
              {onSelect && item.selectable !== false ? (
                <button
                  className={`${styles.name} ${styles.nameButton}`}
                  type="button"
                  title="Ver perfil"
                  onClick={() => onSelect(item)}
                >
                  {item.label}
                </button>
              ) : (
                <span className={styles.name}>{item.label}</span>
              )}
              {item.detail && <span className={styles.detail}>{item.detail}</span>}
            </span>
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
