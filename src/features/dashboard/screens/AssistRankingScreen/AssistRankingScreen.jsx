import PlayerCard from "../../components/PlayerCard/PlayerCard";
import Podium from "../../components/Podium/Podium";
import RankingLayout from "../../components/RankingLayout/RankingLayout";
import { useSdrRanking } from "../../hooks/useSdrRanking";

export default function AssistRankingScreen({ period }) {
  return (
    <RankingLayout
      title={
        <>
          Ranking de
          <br />
          assistências
        </>
      }
      loadingText="Carregando assistências..."
    >
      <AssistPodium period={period} />
    </RankingLayout>
  );
}

function AssistPodium({ period }) {
  const { sdrs } = useSdrRanking(period);

  return (
    <Podium
      items={sdrs}
      emptyText="Nenhuma passagem no período"
      renderItem={(sdr, index) => <PlayerCard player={sdr} position={index + 1} highlighted={index === 0} />}
    />
  );
}
