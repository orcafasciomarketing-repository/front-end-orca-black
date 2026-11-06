import styles from "./UsersPage.module.css";

import { Suspense } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import PageHeader from "../components/PageHeader/PageHeader";
import UsersWidget from "../components/UsersWidget/UsersWidget";
import WidgetFallback from "../components/WidgetFallback/WidgetFallback";

export default function UsersPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="Usuários" description="Quem acessa o admin e o que cada perfil vê" />
      <ErrorBoundary location="Admin › usuários">
        <Suspense fallback={<WidgetFallback title="Usuários" />}>
          <UsersWidget />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
