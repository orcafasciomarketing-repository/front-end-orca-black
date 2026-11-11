import styles from "./GoalBreakdown.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { ORIGINS, TIER_LABELS } from "../../utils/goalMath";

const salesText = (count) => `${count} ${count === 1 ? "venda" : "vendas"}`;

const leadsText = (count) => `${count} ${count === 1 ? "lead" : "leads"}`;

export default function GoalBreakdown({ person, week, title = "Como chegar na meta" }) {
  const hasSales = person.month.salesNeeded !== undefined;
  const hasOrigins = Boolean(person.origins) && ORIGINS.some((origin) => person.origins[origin.key]?.percent > 0);
  if (!hasSales && !hasOrigins) return null;

  return (
    <section className={`widget ${styles.card}`} aria-label={title}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {hasSales && (
          <p className={styles.description}>
            Pelo ticket médio de {formatCurrency(person.ticket)}
            {person.month.leadsNeeded !== undefined && ` e conversão de ${person.conversion}% dos leads`}
          </p>
        )}
      </header>
      {hasSales && (
        <dl className={styles.facts} aria-label="Vendas que faltam">
          <div className={styles.fact}>
            <dt>Vendas que faltam no mês</dt>
            <dd>{salesText(person.month.salesNeeded)}</dd>
            <span className={styles.note}>
              Para a {TIER_LABELS[person.month.current]} ({formatCurrency(person.month.remaining)})
            </span>
          </div>
          {week?.salesNeeded !== undefined && (
            <div className={styles.fact}>
              <dt>Vendas que faltam na semana</dt>
              <dd>{salesText(week.salesNeeded)}</dd>
              <span className={styles.note}>
                Para a {TIER_LABELS[week.current]} da semana ({formatCurrency(week.remaining)})
              </span>
            </div>
          )}
          {person.month.leadsNeeded !== undefined && (
            <div className={styles.fact}>
              <dt>Leads que faltam no mês</dt>
              <dd>{leadsText(person.month.leadsNeeded)}</dd>
            </div>
          )}
          {week?.leadsNeeded !== undefined && (
            <div className={styles.fact}>
              <dt>Leads que faltam na semana</dt>
              <dd>{leadsText(week.leadsNeeded)}</dd>
            </div>
          )}
        </dl>
      )}
      {hasOrigins && (
        <>
          <h4 className={styles.subtitle}>De onde vem a meta do mês</h4>
          <dl className={styles.facts} aria-label="Divisão da meta por origem">
            {ORIGINS.map((origin) => (
              <div key={origin.key} className={styles.fact}>
                <dt>{origin.label}</dt>
                <dd>{formatCurrency(person.origins[origin.key].value)}</dd>
                <span className={styles.note}>{person.origins[origin.key].percent}% da Meta</span>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
