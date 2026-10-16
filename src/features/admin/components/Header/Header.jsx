import styles from "./Header.module.css";
import logo from "../../../../../public/logo.png";

export default function Header() {
  return (
    <header className={styles.header}>
      <img src={logo} className={styles.header_img}></img>
      <div className={styles.filters}>
        <button className={styles.exportButton}>Dados da última semana</button>
        <button className={styles.exportButton}>Exportar </button>
        <select className={styles.namesSelect}>
          <option value="">Todos</option>
          <option value="Roberta">Roberta</option>
        </select>
      </div>
    </header>
  );
}
