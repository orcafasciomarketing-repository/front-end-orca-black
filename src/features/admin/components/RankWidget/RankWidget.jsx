import styles from "./RankWidget.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../../shared/components/ErrorBoundary/ErrorBoundary";
import { useRankVendors } from "../../hooks/useRankVendors";
import { useSegmentRankVendors } from "../../hooks/useSegmentRanks";
import RankList from "../RankList/RankList";

const TABS = [
  { type: "sales", label: "Vendas" },
  { type: "farm", label: "Renovação" },
];

export default function RankWidget({ segment = "" }) {
  const [activeType, setActiveType] = useState("sales");

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Rank dos vendedores</h2>
        <div className={styles.tabs} role="tablist" aria-label="Tipo de ranking">
          {TABS.map((tab) => (
            <button
              key={tab.type}
              className={`${styles.tab} ${tab.type === activeType ? styles.tabActive : ""}`}
              type="button"
              role="tab"
              aria-selected={tab.type === activeType}
              onClick={() => setActiveType(tab.type)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>
      <ErrorBoundary key={`${activeType}-${segment}`} location={`Admin › rank dos vendedores (${activeType})`}>
        <Suspense fallback={<p className={styles.loading}>Carregando ranking...</p>}>
          {segment ? <SegmentVendorRank type={activeType} segment={segment} /> : <VendorRank type={activeType} />}
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}

function VendorRank({ type }) {
  const { rank } = useRankVendors(type);

  return <VendorRankList rank={rank} />;
}

function SegmentVendorRank({ type, segment }) {
  const { rank } = useSegmentRankVendors(type, segment);

  return <VendorRankList rank={rank} />;
}

function VendorRankList({ rank }) {
  const items = rank.map((vendor) => ({ ...vendor, id: vendor.vendorId }));

  return <RankList items={items} emptyText="Nenhuma venda pontuada ainda" />;
}
