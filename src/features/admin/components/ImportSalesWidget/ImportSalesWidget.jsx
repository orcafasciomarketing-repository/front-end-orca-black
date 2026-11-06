import styles from "./ImportSalesWidget.module.css";

import { useState } from "react";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import { readCsvFile } from "../../api/importApi";
import { useImportSales } from "../../hooks/useImportSales";
import { UploadIcon } from "../Icons/Icons";

const ISSUE_GROUPS = [
  { field: "errors", title: "Erros (impedem a importação)", tone: "error" },
  { field: "duplicates", title: "Possíveis duplicadas (contariam duas vezes)", tone: "warning" },
  { field: "warnings", title: "Avisos", tone: "warning" },
  { field: "ignored", title: "Linhas ignoradas", tone: "muted" },
];

const pluralSales = (count) => `${count} ${count === 1 ? "venda" : "vendas"}`;

export default function ImportSalesWidget() {
  const { preview, confirm } = useImportSales();
  const [file, setFile] = useState(null);
  const [readFailed, setReadFailed] = useState(false);

  // Resultado da importação (sucesso ou recusa) tem prioridade sobre a prévia
  const report = confirm.data?.report ?? preview.data;
  const imported = confirm.data?.imported === true;
  const hasErrors = report?.errors.length > 0;
  const canConfirm = !!file && !!report && !hasErrors && report.file.count > 0 && !imported;

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    preview.reset();
    confirm.reset();
    setReadFailed(false);
    setFile(null);
    if (!selectedFile) return;

    try {
      const csvText = await readCsvFile(selectedFile);
      setFile({ name: selectedFile.name, csvText });
      preview.mutate(csvText);
    } catch {
      setReadFailed(true);
    }
  };

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Importar vendas</h2>
      </header>
      <div className={styles.body}>
        <p className={styles.help}>
          O arquivo substitui todas as vendas importadas antes: para corrigir, adicionar ou remover, mude o arquivo e
          importe de novo. As vendas da planilha principal não são alteradas. Colunas obrigatórias: Setor, Valor da venda
          e Data da venda. Sem Vendedor, a venda só conta na meta.
        </p>

        <label className={styles.fileButton}>
          <UploadIcon />
          <span>{file ? file.name : "Escolher arquivo CSV"}</span>
          <input
            className={styles.fileInput}
            type="file"
            accept=".csv,text/csv"
            aria-label="Arquivo CSV"
            onChange={handleFileChange}
          />
        </label>

        {readFailed && <p className={styles.error}>Não foi possível ler o arquivo</p>}
        {preview.isPending && <p className={styles.muted}>Lendo o arquivo...</p>}
        {preview.isError && <p className={styles.error}>Não foi possível gerar a prévia: {preview.error.message}</p>}

        {report && <ImportSummary report={report} imported={imported} />}

        {report &&
          ISSUE_GROUPS.map(
            (group) =>
              report[group.field].length > 0 && (
                <IssueList key={group.field} title={group.title} tone={group.tone} items={report[group.field]} />
              ),
          )}

        {confirm.isError && <p className={styles.error}>Não foi possível importar: {confirm.error.message}</p>}
        {confirm.data && !imported && <p className={styles.error}>O arquivo tem erros, nada foi importado</p>}
        {imported && (
          <p className={styles.success}>Importação concluída: {pluralSales(report.current.count)} importadas</p>
        )}

        {report && !imported && (
          <button
            className={styles.confirmButton}
            type="button"
            disabled={!canConfirm || confirm.isPending}
            onClick={() => confirm.mutate(file.csvText)}
          >
            {confirm.isPending ? "Importando..." : "Confirmar importação"}
          </button>
        )}
      </div>
    </section>
  );
}

function ImportSummary({ report, imported }) {
  const { current, file } = report;

  return (
    <dl className={styles.summary}>
      <div className={styles.summaryItem}>
        <dt>{imported ? "Importadas agora" : "Importadas hoje"}</dt>
        <dd>
          {pluralSales(current.count)} · {formatCurrency(current.total)}
        </dd>
      </div>
      {!imported && (
        <div className={styles.summaryItem}>
          <dt>No arquivo</dt>
          <dd>
            {pluralSales(file.count)} · {formatCurrency(file.total)}
          </dd>
          <p className={styles.muted}>
            {file.withVendor} com vendedor · {file.withoutVendor} sem vendedor
          </p>
        </div>
      )}
    </dl>
  );
}

function IssueList({ title, tone, items }) {
  return (
    <section className={`${styles.issues} ${styles[tone]}`} aria-label={title}>
      <h3 className={styles.issuesTitle}>
        {title} ({items.length})
      </h3>
      <ul className={styles.issuesList}>
        {items.map((item) => (
          <li key={`${item.linha}-${item.mensagem}`}>
            <strong>Linha {item.linha}:</strong> {item.mensagem}
          </li>
        ))}
      </ul>
    </section>
  );
}
