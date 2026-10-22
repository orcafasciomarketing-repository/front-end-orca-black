import styles from "./Podium.module.css";

export default function Podium({ items, emptyText, renderItem }) {
  if (items.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }

  return (
    <ol className={styles.podium}>
      {items.map((item, index) => (
        <li key={item.id} className={styles.item}>
          {renderItem(item, index)}
        </li>
      ))}
    </ol>
  );
}
