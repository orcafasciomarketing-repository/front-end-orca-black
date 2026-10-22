import styles from "./TestReportWidget.module.css";

import { useTestReport } from "../../hooks/useTestReport";
import { formatDateTime } from "../../utils/formatDateTime";

const STATUS_ICONS = {
  passed: "✓",
  failed: "✗",
};

export default function TestReportWidget() {
  const { report } = useTestReport();

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Logs de teste</h2>
        {report && (
          <span className={`${styles.count} ${report.success ? "" : styles.countError}`}>
            {report.passed}/{report.total}
          </span>
        )}
      </header>
      {report ? <TestReport report={report} /> : <p className={styles.empty}>Nenhum relatório encontrado. Rode npm test para gerar.</p>}
    </section>
  );
}

function TestReport({ report }) {
  return (
    <div className={styles.content}>
      <p className={styles.summary}>
        Rodado em {formatDateTime(report.ranAt)} · {report.passed} passaram · {report.failed} falharam ·{" "}
        {report.skipped} pulados
      </p>
      <ul className={styles.list}>
        {report.files.map((file) => (
          <li key={file.name} className={styles.file}>
            <details open={file.status === "failed"}>
              <summary className={`${styles.fileName} ${styles[file.status] ?? ""}`}>
                {STATUS_ICONS[file.status] ?? "•"} {file.name}
              </summary>
              <ul className={styles.tests}>
                {file.tests.map((test) => (
                  <li key={test.name} className={`${styles.test} ${styles[test.status] ?? ""}`}>
                    <span>
                      {STATUS_ICONS[test.status] ?? "•"} {test.name}
                    </span>
                    {test.failureMessages.length > 0 && (
                      <pre className={styles.failure}>{test.failureMessages.join("\n")}</pre>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
