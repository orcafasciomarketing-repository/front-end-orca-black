import styles from "./ErrorLogWidget.module.css";

import { useErrorLogs } from "../../hooks/useErrorLogs";
import { formatDateTime } from "../../utils/formatDateTime";

export default function ErrorLogWidget() {
  const { logs } = useErrorLogs();

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Logs de erro</h2>
        <span className={`${styles.count} ${logs.length > 0 ? styles.countError : ""}`}>{logs.length}</span>
      </header>
      {logs.length === 0 ? (
        <p className={styles.empty}>Nenhum erro registrado</p>
      ) : (
        <ul className={styles.list}>
          {logs.map((log) => (
            <li key={log._id} className={styles.item}>
              <div className={styles.itemTop}>
                <strong className={styles.location}>{log.location}</strong>
                <time className={styles.date} dateTime={log.occurredAt}>
                  {formatDateTime(log.occurredAt)}
                </time>
              </div>
              <p className={styles.message}>{log.message}</p>
              <p className={styles.url}>{log.url}</p>
              {(log.stack || log.componentStack) && (
                <details className={styles.details}>
                  <summary>Stack</summary>
                  <pre className={styles.stack}>
                    {[log.stack, log.componentStack].filter(Boolean).join("\n\nComponentes:")}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
