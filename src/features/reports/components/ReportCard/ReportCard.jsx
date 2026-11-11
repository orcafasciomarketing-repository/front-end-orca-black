import styles from "./ReportCard.module.css";

import { useState } from "react";

import { reportError } from "../../../../shared/errorLogger";
import { DownloadIcon } from "../../../admin/components/Icons/Icons";
import { downloadWorkbook } from "../../utils/xlsx";

const errorMessage = (error) => error?.response?.data?.error ?? error?.message ?? "Erro inesperado";

export default function ReportCard({ title, description, children, excel, onPdf }) {
  const [status, setStatus] = useState({ busy: false, error: "" });

  const handleExcel = async () => {
    setStatus({ busy: true, error: "" });
    try {
      const { fileName, sheets } = await excel();
      await downloadWorkbook(fileName, sheets);
      setStatus({ busy: false, error: "" });
    } catch (error) {
      reportError(error, { location: `Relatórios › ${title}` });
      setStatus({ busy: false, error: errorMessage(error) });
    }
  };

  return (
    <section className={`widget ${styles.card}`} aria-label={`Relatório ${title}`}>
      <div className={styles.text}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
        {children}
      </div>
      <div className={styles.actions}>
        {excel && (
          <button className={styles.button} type="button" disabled={status.busy} onClick={handleExcel}>
            <DownloadIcon />
            {status.busy ? "Gerando..." : "Baixar Excel"}
          </button>
        )}
        {onPdf && (
          <button className={styles.button} type="button" onClick={onPdf}>
            <DownloadIcon />
            Gerar PDF
          </button>
        )}
      </div>
      {status.error && <p className={styles.error}>Não foi possível gerar: {status.error}</p>}
    </section>
  );
}
