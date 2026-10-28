import { useRankSdrs } from "../../hooks/useRankSdrs";
import RankList from "../RankList/RankList";

export default function SdrRankWidget() {
  const { rank } = useRankSdrs();
  const items = rank.map((sdr) => ({ ...sdr, id: sdr.sdrId }));

  return (
    <section className="widget">
      <header className="header">
        <h2 className="title">Rank das passagens</h2>
      </header>
      <RankList items={items} emptyText="Nenhuma passagem ainda" />
    </section>
  );
}
