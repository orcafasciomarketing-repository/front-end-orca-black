import styles from "./ReportPreview.module.css";

import { useEffect, useRef, useState } from "react";

const generatedFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function ReportPreview({ title, details, onClose, children }) {
  const ref = useRef(null);
  const [generatedAt] = useState(() => new Date());

  useEffect(() => {
    ref.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <section ref={ref} className={`${styles.preview} report-print-area`} aria-label={`Pré-visualização: ${title}`}>
      <div className={styles.toolbar}>
        <p className={styles.toolbarText}>Confira o relatório e salve em PDF pela janela de impressão.</p>
        <button className={styles.primaryButton} type="button" onClick={() => window.print()}>
          Salvar PDF
        </button>
        <button className={styles.secondaryButton} type="button" onClick={onClose}>
          Fechar
        </button>
      </div>
      <article className={styles.document}>
        <header className={styles.docHeader}>
          <img className={styles.logo} src="/orca-black-logo.png" alt="" />
          <div>
            <h2 className={styles.docTitle}>{title}</h2>
            <p className={styles.docDetails}>
              {[...details, `Gerado em ${generatedFormatter.format(generatedAt)}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </header>
        {children}
      </article>
    </section>
  );
}

export function ReportSection({ title, children }) {
  return (
    <section className={styles.section} aria-label={title}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}

export function ReportTiles({ items, label }) {
  return (
    <dl className={styles.tiles} aria-label={label}>
      {items.map((item) => (
        <div key={item.label} className={styles.tile}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          {item.hint && <span className={styles.hint}>{item.hint}</span>}
        </div>
      ))}
    </dl>
  );
}

export function ReportTable({ label, columns, rows, empty = "Nada para mostrar" }) {
  if (!rows.length) return <p className={styles.empty}>{empty}</p>;
  return (
    <table className={styles.table} aria-label={label}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" className={column.number ? styles.number : undefined}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.key ?? index}>
            {columns.map((column) => (
              <td key={column.key} className={column.number ? styles.number : undefined}>
                {row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
