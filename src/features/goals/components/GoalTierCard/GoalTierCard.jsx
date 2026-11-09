import styles from "./GoalTierCard.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { STATUS_LABELS, TIER_LABELS, TIERS } from "../../utils/goalMath";

const TIER_CLASS = { goal: "tierGoal", super: "tierSuper", black: "tierBlack" };

export default function GoalTierCard({ title, period, progress, showPace = true }) {
  const { current, realized, target, percent, remaining, excess, reached, pace } = progress;
  const allReached = reached.length === TIERS.length;
  const label = TIER_LABELS[current];

  return (
    <section className={`widget ${styles.card}`} aria-label={title}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          {period && <p className={styles.period}>{period}</p>}
        </div>
        <span className={`${styles.tier} ${styles[TIER_CLASS[current]]}`}>{label}</span>
      </header>
      <p className={styles.amounts}>
        <strong className={styles.realized}>{formatCurrency(realized)}</strong>
        <span className={styles.target}>de {formatCurrency(target)}</span>
        <span className={styles.percent}>{percent.toLocaleString("pt-BR")}%</span>
      </p>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={`Progresso da ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percent, 100)}
      >
        <div
          className={`${styles.fill} ${styles[TIER_CLASS[current]]}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <p className={styles.note}>
        {allReached
          ? excess > 0
            ? `Meta black batida, com ${formatCurrency(excess)} além dela`
            : "Meta black batida!"
          : `Faltam ${formatCurrency(remaining)} para a ${label}`}
      </p>
      {reached.length > 0 && (
        <ul className={styles.reached} aria-label="Faixas batidas">
          {reached.map((tier) => (
            <li key={tier} className={styles.reachedItem}>
              {TIER_LABELS[tier]} ✓
            </li>
          ))}
        </ul>
      )}
      {showPace && pace && (
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Situação</dt>
            <dd className={styles[pace.status]}>{STATUS_LABELS[pace.status]}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Ritmo para a Meta</dt>
            <dd>
              {pace.status === "done" || pace.remainingDays === 0 ? "—" : `${formatCurrency(pace.neededPerDay)}/dia`}
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>Projeção no ritmo atual</dt>
            <dd>{pace.elapsedDays > 0 ? formatCurrency(pace.projection) : "—"}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
