import styles from "./WeekGoalWidget.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { useForecast } from "../../hooks/useForecast";
import { formatDay } from "../../utils/chartData";
import { formatPercent } from "../../utils/chartScale";

const TITLE = "Meta da semana";

export default function WeekGoalWidget({ segment = "" }) {
  const { forecast } = useForecast(segment);
  const { week, weekGoal } = forecast;
  const period = `${formatDay(week.start)} a ${formatDay(week.end)}`;

  if (!weekGoal) {
    return (
      <section className="widget" aria-label={TITLE}>
        <header className="header">
          <h2 className="title">{TITLE}</h2>
          <span className={styles.period}>{period}</span>
        </header>
        <p className={styles.empty}>Sem meta semanal fora da campanha</p>
      </section>
    );
  }

  const percent = weekGoal.percent ?? 100;
  const reached = weekGoal.remaining === 0;

  return (
    <section className="widget" aria-label={TITLE}>
      <header className="header">
        <h2 className="title">{TITLE}</h2>
        <span className={styles.period}>
          {period}
          {segment && !forecast.goalIsTotal ? ` · ${segment}` : ""}
        </span>
      </header>
      <div className={styles.body}>
        <div className={styles.progress}>
          <p className={styles.amounts}>
            <strong className={styles.sold}>{formatCurrency(weekGoal.sold)}</strong>
            <span className={styles.goal}>de {formatCurrency(weekGoal.goal)}</span>
            <span className={styles.percent}>{formatPercent(percent / 100)}</span>
          </p>
          <div
            className={styles.track}
            role="progressbar"
            aria-label="Progresso da meta da semana"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(percent, 100)}
          >
            <div className={styles.fill} style={{ width: `${Math.min(percent, 100)}%` }} />
          </div>
        </div>
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>{reached ? "Situação" : "Falta na semana"}</dt>
            <dd className={reached ? styles.reached : undefined}>
              {reached ? "Meta da semana batida!" : formatCurrency(weekGoal.remaining)}
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>Ritmo necessário</dt>
            <dd>
              {weekGoal.requiredPace === null || reached ? (
                "—"
              ) : (
                <>
                  {formatCurrency(weekGoal.requiredPace)}
                  <span className={styles.unit}>/dia</span>
                </>
              )}
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>Cenário realista da semana</dt>
            <dd>{formatCurrency(week.scenarios.realistic)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Dias produtivos restantes</dt>
            <dd>{week.remainingDays}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
