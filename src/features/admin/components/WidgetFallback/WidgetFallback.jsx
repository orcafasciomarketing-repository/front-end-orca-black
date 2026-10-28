import styles from "./WidgetFallback.module.css";

export default function WidgetFallback({ title }) {
  return (
    <section className="widget" aria-busy="true">
      <header className="header">
        <h2 className="title">{title}</h2>
      </header>
      <div className={styles.body}>
        <span className={styles.line} />
        <span className={styles.line} />
        <span className={`${styles.line} ${styles.lineShort}`} />
      </div>
    </section>
  );
}
