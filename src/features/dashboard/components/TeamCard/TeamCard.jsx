import styles from "./TeamCard.module.css";

const formatPoints = (points) => `${points} ${points === 1 ? "ponto" : "pontos"}`;

const DETAIL_ROWS = [
  { label: "Vendas", field: "sales" },
  { label: "Farmer", field: "farm" },
  { label: "Passagens", field: "passage" },
];

export default function TeamCard({ team, highlighted = false }) {
  return (
    <article className={`${styles.card} ${highlighted ? styles.highlighted : ""}`} aria-label={team.teamName}>
      <div className={styles.shirt}>
        {team.teamShirt && <img className={styles.shirtImage} src={team.teamShirt} alt={team.teamName} />}
      </div>
      <div className={styles.body}>
        <p className={styles.score}>
          <strong className={styles.points}>{team.total}</strong>
          <span className={styles.pointsLabel}>Pontos</span>
        </p>
        <dl className={styles.details}>
          {DETAIL_ROWS.map((row) => (
            <div key={row.field} className={styles.detailRow}>
              <dt className={styles.detailLabel}>{row.label}</dt>
              <dd className={styles.detailValue}>{formatPoints(team[row.field] ?? 0)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
