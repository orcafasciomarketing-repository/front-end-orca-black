import styles from "./RankWidget.module.css";
import { useRankVendors } from "../../hooks/useRankVendors";

export default function RankWidget() {
  const adminRank = useRankVendors("farm");

  console.log(adminRank);

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Rank dos vendedores</h2>
      </header>
      <ul className={styles.list}>
        <li className={styles.list_item}>
          <span>1º</span>
          <span>Nome</span>
          <span>pontos</span>
        </li>
      </ul>
    </section>
  );
}
