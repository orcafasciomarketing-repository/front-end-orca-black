import styles from "./RankList.module.css";

const formatPoints = (points) => `${points} ${points === 1 ? "ponto" : "pontos"}`;

export default function RankList({ items, emptyText }) {
  if (items.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }

  return (
    <ol className={styles.list}>
      {items.map((item, index) => (
        <li key={item.id} className={styles.item}>
          <span className={`${styles.position} ${styles[`position${index + 1}`] ?? ""}`}>{index + 1}º</span>
          <div className={styles.person}>
            <span className={styles.name}>{item.name}</span>
            {item.job && <span className={styles.job}>{item.job}</span>}
          </div>
          <span className={styles.points}>{formatPoints(item.points)}</span>
        </li>
      ))}
    </ol>
  );
}
