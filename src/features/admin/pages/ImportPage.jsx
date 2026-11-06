import styles from "./ImportPage.module.css";

import ImportSalesWidget from "../components/ImportSalesWidget/ImportSalesWidget";
import PageHeader from "../components/PageHeader/PageHeader";

export default function ImportPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="Importação" description="Vendas enviadas por arquivo, fora da planilha principal" />
      <ImportSalesWidget />
    </div>
  );
}
