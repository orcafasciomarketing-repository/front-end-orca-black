import styles from "./TierProgressCard.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { TIER_LABELS } from "../../utils/goalMath";

const TIER_CLASS = { goal: "tierGoal", super: "tierSuper", black: "tierBlack" };

const formatPercent = (value) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

function stateOf(tier, progress) {
  if (progress.reached.includes(tier)) return { label: "Batida", className: "stateDone" };
  if (progress.current === tier) return { label: "Buscando agora", className: "stateCurrent" };
  return { label: "Próxima faixa", className: "stateNext" };
}

export default function TierProgressCard({ tier, progress, forecast, period }) {
  const label = TIER_LABELS[tier];
  const target = progress.tiers[tier];
  const percent = target > 0 ? Math.round((progress.realized / target) * 1000) / 10 : 0;
  const reached = progress.reached.includes(tier);
  const state = stateOf(tier, progress);
  const tierForecast = forecast?.tiers?.[tier];
  const realistic = forecast?.scenarios?.realistic;

  return (
    <section className={`widget ${styles.card}`} aria-label={`${label}${period ? ` · ${period}` : ""}`}>
      <header className={styles.header}>
        <h3 className={styles.title}>
          <span className={`${styles.dot} ${styles[TIER_CLASS[tier]]}`} />
          {label}
        </h3>
        <span className={`${styles.state} ${styles[state.className]}`}>{state.label}</span>
      </header>
      <p className={styles.amounts}>
        <strong className={styles.realized}>{formatCurrency(progress.realized)}</strong>
        <span className={styles.target}>de {formatCurrency(target)}</span>
        <span className={styles.percent}>{formatPercent(percent)}</span>
      </p>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={`Progresso da ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(percent, 100)}
      >
        <div className={`${styles.fill} ${styles[TIER_CLASS[tier]]}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <p className={styles.note}>
        {reached
          ? progress.realized > target
            ? `Batida, com ${formatCurrency(progress.realized - target)} além dela`
            : "Batida!"
          : `Faltam ${formatCurrency(target - progress.realized)}`}
      </p>
      {tierForecast && (
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Precisa por dia</dt>
            <dd>
              {reached || tierForecast.requiredPace === null ? "—" : `${formatCurrency(tierForecast.requiredPace)}`}
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>Chance de bater</dt>
            <dd>{tierForecast.probability === null ? "—" : formatPercent(tierForecast.probability)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Previsão realista</dt>
            <dd className={realistic >= target ? styles.good : styles.bad}>
              {reached
                ? "Batida"
                : realistic >= target
                  ? `Bate (+${formatCurrency(realistic - target)})`
                  : `Faltariam ${formatCurrency(target - realistic)}`}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
