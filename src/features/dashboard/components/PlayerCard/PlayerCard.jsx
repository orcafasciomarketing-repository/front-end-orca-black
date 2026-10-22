import styles from "./PlayerCard.module.css";

export default function PlayerCard({ player, position, highlighted = false }) {
  return (
    <article className={`${styles.card} ${highlighted ? styles.highlighted : ""}`}>
      <span className={styles.position}>{position}º</span>
      <h2 className={styles.name}>{player.name}</h2>
      <p className={styles.score}>
        <strong className={styles.points}>{player.points}</strong>
        <span className={styles.pointsLabel}>{player.points === 1 ? "Ponto" : "Pontos"}</span>
      </p>
    </article>
  );
}
