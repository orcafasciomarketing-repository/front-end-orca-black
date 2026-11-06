import { Suspense, useState } from "react";

import ErrorBoundary from "../../../../shared/components/ErrorBoundary/ErrorBoundary";
import { useRankSdrs } from "../../hooks/useRankSdrs";
import { withMovement } from "../../utils/rankMovement";
import RankList from "../RankList/RankList";
import RankPeriodTabs from "../RankPeriodTabs/RankPeriodTabs";
import styles from "../RankWidget/RankWidget.module.css";

export default function SdrRankWidget({ segment = "" }) {
  const [period, setPeriod] = useState("all");

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Rank das passagens</h2>
      </header>
      <RankPeriodTabs value={period} onChange={setPeriod} label="Período do ranking de passagens" />
      <ErrorBoundary key={`${period}-${segment}`} location="Admin › rank das passagens">
        <Suspense fallback={<p className={styles.loading}>Carregando ranking...</p>}>
          {period === "week" ? <WeekSdrRank segment={segment} /> : <SdrRank period={period} segment={segment} />}
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}

function SdrRank({ period, segment }) {
  const { rank } = useRankSdrs({ period, segment });

  return <SdrRankList rank={rank} />;
}

function WeekSdrRank({ segment }) {
  const { rank } = useRankSdrs({ period: "week", segment });
  const { rank: lastWeek } = useRankSdrs({ period: "lastWeek", segment });

  return <SdrRankList rank={withMovement(rank, lastWeek, (sdr) => sdr.sdrId)} />;
}

function SdrRankList({ rank }) {
  const items = rank.map((sdr) => ({ ...sdr, id: sdr.sdrId }));

  return <RankList items={items} emptyText="Nenhuma passagem ainda" />;
}
