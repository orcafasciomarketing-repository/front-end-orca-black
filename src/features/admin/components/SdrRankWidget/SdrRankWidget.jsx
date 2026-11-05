import { useRankSdrs } from "../../hooks/useRankSdrs";
import { useSegmentRankSdrs } from "../../hooks/useSegmentRanks";
import RankList from "../RankList/RankList";

export default function SdrRankWidget({ segment = "" }) {
  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Rank das passagens</h2>
      </header>
      {segment ? <SegmentSdrRank segment={segment} /> : <SdrRank />}
    </section>
  );
}

function SdrRank() {
  const { rank } = useRankSdrs();

  return <SdrRankList rank={rank} />;
}

function SegmentSdrRank({ segment }) {
  const { rank } = useSegmentRankSdrs(segment);

  return <SdrRankList rank={rank} />;
}

function SdrRankList({ rank }) {
  const items = rank.map((sdr) => ({ ...sdr, id: sdr.sdrId }));

  return <RankList items={items} emptyText="Nenhuma passagem ainda" />;
}
