import styles from "./ShareBar.module.css";

import { useState } from "react";

import { formatPercent } from "../../utils/chartScale";

function LegendRow({ item, formatValue }) {
  return (
    <>
      <span className={styles.swatch} style={{ background: item.color }} />
      <span className={styles.label}>{item.label}</span>
      <strong className={styles.percent}>{formatPercent(item.share)}</strong>
      <span className={styles.value}>{formatValue(item.value)}</span>
    </>
  );
}

function ExpandableItem({ item, formatValue }) {
  const [isOpen, setIsOpen] = useState(false);
  const listId = `share-details-${item.key}`;

  return (
    <li className={styles.expandable}>
      <button
        className={`${styles.item} ${styles.toggle}`}
        type="button"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen(!isOpen)}
      >
        <LegendRow item={item} formatValue={formatValue} />
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {isOpen && (
        <ul id={listId} className={styles.details} aria-label={`Detalhes: ${item.label}`}>
          {item.details.map((detail) => (
            <li key={detail.key} className={styles.item}>
              <LegendRow item={{ ...detail, color: item.color }} formatValue={formatValue} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

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
        {items.map((item) =>
          item.details?.length ? (
            <ExpandableItem key={item.key} item={item} formatValue={formatValue} />
          ) : (
            <li key={item.key} className={styles.item}>
              <LegendRow item={item} formatValue={formatValue} />
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
