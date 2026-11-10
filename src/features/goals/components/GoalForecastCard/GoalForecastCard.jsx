import styles from "./GoalForecastCard.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";

const SCENARIOS = [
  { key: "pessimistic", label: "Pessimista" },
  { key: "realistic", label: "Realista" },
  { key: "optimistic", label: "Otimista" },
];

export default function GoalForecastCard({ forecast, title = "Previsão do mês" }) {
  const { productiveDays, pace, scenarios } = forecast;
  const closed = productiveDays.remaining === 0;

  return (
    <section className={`widget ${styles.card}`} aria-label={title}>
      <header className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>
          Mesmo modelo do Forecast: ritmo ponderado dos últimos 7 e 30 dias produtivos e do mês, projetado nos dias
          produtivos que faltam
        </p>
      </header>
      <dl className={styles.scenarios} aria-label="Cenários para o fim do mês">
        {SCENARIOS.map((scenario) => (
          <div
            key={scenario.key}
            className={`${styles.scenario} ${scenario.key === "realistic" ? styles.scenarioMain : ""}`}
          >
            <dt>{scenario.label}</dt>
            <dd>{formatCurrency(scenarios[scenario.key])}</dd>
          </div>
        ))}
      </dl>
      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Ritmo atual</dt>
          <dd>{formatCurrency(pace.current)}/dia</dd>
        </div>
        <div className={styles.fact}>
          <dt>Dias produtivos</dt>
          <dd>
            {closed ? "Mês encerrado" : `${productiveDays.elapsed} passados · ${productiveDays.remaining} restantes`}
          </dd>
        </div>
      </dl>
    </section>
  );
}
