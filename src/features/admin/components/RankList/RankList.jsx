import styles from "./RankList.module.css";

import Avatar from "../Avatar/Avatar";

const MOVEMENT_TEXT = {
  up: (by) => ({ symbol: `▲ ${by}`, label: `subiu ${by} ${by === 1 ? "posição" : "posições"} desde a semana passada` }),
  down: (by) => ({ symbol: `▼ ${by}`, label: `caiu ${by} ${by === 1 ? "posição" : "posições"} desde a semana passada` }),
  same: () => ({ symbol: "=", label: "mesma posição da semana passada" }),
  new: () => ({ symbol: "novo", label: "não estava no top 3 da semana passada" }),
};

function Movement({ movement }) {
  const { symbol, label } = MOVEMENT_TEXT[movement.type](movement.by);

  return (
    <span className={`${styles.movement} ${styles[movement.type]}`} title={label}>
      <span aria-hidden="true">{symbol}</span>
      <span className={styles.srOnly}>{label}</span>
    </span>
  );
}

const formatPoints = (points) => `${points} ${points === 1 ? "ponto" : "pontos"}`;

export default function RankList({ items, emptyText, onSelect }) {
  if (items.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }

  return (
    <ol className={styles.list}>
      {items.map((item, index) => (
        <li key={item.id} className={styles.item}>
          <span className={`${styles.position} ${styles[`position${index + 1}`] ?? ""}`}>{index + 1}º</span>
          <Avatar name={item.name} imageUrl={item.imageUrl} />
          <div className={styles.person}>
            {onSelect ? (
              <button
                className={`${styles.name} ${styles.nameButton}`}
                type="button"
                title="Ver perfil"
                onClick={() => onSelect(item)}
              >
                {item.name}
              </button>
            ) : (
              <span className={styles.name}>{item.name}</span>
            )}
            {item.job && <span className={styles.job}>{item.job}</span>}
          </div>
          {item.movement && <Movement movement={item.movement} />}
          <span className={styles.points}>{formatPoints(item.points)}</span>
        </li>
      ))}
    </ol>
  );
}
