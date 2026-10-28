import styles from "./ErrorsPage.module.css";

import { Suspense } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import ErrorLogWidget from "../components/ErrorLogWidget/ErrorLogWidget";
import PageHeader from "../components/PageHeader/PageHeader";
import TestReportWidget from "../components/TestReportWidget/TestReportWidget";
import WidgetFallback from "../components/WidgetFallback/WidgetFallback";

export default function ErrorsPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="Erros" description="Erros registrados pelas TVs e pelo admin, e o resultado dos testes" />
      <div className={styles.grid}>
        <ErrorBoundary location="Admin › logs de erro">
          <Suspense fallback={<WidgetFallback title="Logs de erro" />}>
            <ErrorLogWidget />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary location="Admin › logs de teste">
          <Suspense fallback={<WidgetFallback title="Logs de teste" />}>
            <TestReportWidget />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
