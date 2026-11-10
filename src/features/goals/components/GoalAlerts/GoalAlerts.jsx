import styles from "./GoalAlerts.module.css";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { buildGoalAlerts } from "../../utils/goalAlerts";
import { TIER_LABELS } from "../../utils/goalMath";

const GROUPS = [
  { key: "lowChance", title: "Chance baixa de bater a Meta", tone: "danger" },
  { key: "noSales", title: "Sem vendas há dias", tone: "warning" },
  { key: "nearTier", title: "Perto da próxima faixa", tone: "good" },
];

const detailOf = (key, item) => {
  if (key === "lowChance") return `${item.chance.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de chance`;
  if (key === "noSales") return item.days === null ? "Nenhuma venda no mês" : `Última venda há ${item.days} dias`;
  return `Faltam ${formatCurrency(item.remaining)} para a ${TIER_LABELS[item.tier]}`;
};

export default function GoalAlerts({ people, progress, onSelect }) {
  const alerts = buildGoalAlerts(people, progress);
  if (!alerts) return null;
  const groups = GROUPS.filter((group) => alerts[group.key].length > 0);

  return (
    <section className={`widget ${styles.card}`} aria-label="Alertas do mês">
      <header className={styles.header}>
        <h2 className="title">Alertas do mês</h2>
        <p className={styles.description}>Quem precisa de atenção agora. Clique no nome para ver o vendedor.</p>
      </header>
      {groups.length === 0 ? (
        <p className={styles.empty}>Nenhum alerta: todo mundo com chance boa e vendendo</p>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
            <div key={group.key} className={`${styles.group} ${styles[group.tone]}`}>
              <h3 className={styles.groupTitle}>
                {group.title} <span className={styles.count}>{alerts[group.key].length}</span>
              </h3>
              <ul className={styles.list} aria-label={group.title}>
                {alerts[group.key].map((item) => (
                  <li key={item.person.vendorId} className={styles.item}>
                    <button className={styles.name} type="button" onClick={() => onSelect(item.person.vendorId)}>
                      {item.person.name}
                    </button>
                    <span className={styles.detail}>{detailOf(group.key, item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
