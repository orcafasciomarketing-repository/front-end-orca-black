import styles from "./MonthComparison.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useGoalHistory } from "../../hooks/useGoals";
import { formatMonth, TIER_LABELS, TIERS } from "../../utils/goalMath";

const formatChange = (value, base) => {
  if (!(base > 0)) return null;
  const change = Math.round(((value - base) / base) * 1000) / 10;
  return `${change > 0 ? "+" : ""}${change.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
};

const reachedLabel = (row) => {
  if (!row.tiers) return "Sem meta cadastrada";
  const reached = TIERS.filter((tier) => row.tiers[tier] > 0 && row.realized >= row.tiers[tier]);
  return reached.length ? `Bateu a ${TIER_LABELS[reached[reached.length - 1]]}` : "Não bateu a Meta";
};

export default function MonthComparison({ label, month, scope, pickHistory, useHistory = useGoalHistory }) {
  const { history } = useHistory(month);
  const previousItem = history.months.length > 1 ? history.months[history.months.length - 2] : null;
  const previous = previousItem ? { month: previousItem.month, ...pickHistory(previousItem) } : null;
  const realized = scope.month.realized;
  const realistic = scope.forecast?.scenarios?.realistic ?? null;
  const title = `Comparação com o mês anterior · ${label}`;

  return (
    <section className={`widget ${styles.card}`} aria-label={title}>
      <header>
        <h3 className={styles.title}>{title}</h3>
      </header>
      {!previous ? (
        <p className={styles.empty}>Sem mês anterior para comparar</p>
      ) : (
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>{formatMonth(previous.month)}</dt>
            <dd>{formatCurrency(previous.realized)}</dd>
            <span className={styles.note}>{reachedLabel(previous)}</span>
          </div>
          <div className={styles.fact}>
            <dt>Este mês até agora</dt>
            <dd>{formatCurrency(realized)}</dd>
            <span className={styles.note}>
              {previous.realized > 0
                ? `${Math.round((realized / previous.realized) * 1000) / 10}% do mês anterior`.replace(".", ",")
                : "Mês anterior sem vendas"}
            </span>
          </div>
          {realistic !== null && (
            <div className={styles.fact}>
              <dt>Previsão realista do mês</dt>
              <dd>{formatCurrency(realistic)}</dd>
              <span className={styles.note}>
                {formatChange(realistic, previous.realized)
                  ? `${formatChange(realistic, previous.realized)} sobre o mês anterior`
                  : "Mês anterior sem vendas"}
              </span>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
