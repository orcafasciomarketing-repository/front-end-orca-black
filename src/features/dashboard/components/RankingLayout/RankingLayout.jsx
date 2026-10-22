import styles from "./RankingLayout.module.css";

import { Suspense } from "react";

export default function RankingLayout({ title, subtitle, accent = false, loadingText, children }) {
  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={`${styles.subtitle} ${accent ? styles.subtitleAccent : ""}`}>{subtitle}</p>}
      </header>
      <img className={styles.logo} src="/orca-black-logo.png" alt="Orça Black" />
      <Suspense fallback={<p className={styles.loading}>{loadingText}</p>}>{children}</Suspense>
    </section>
  );
}
