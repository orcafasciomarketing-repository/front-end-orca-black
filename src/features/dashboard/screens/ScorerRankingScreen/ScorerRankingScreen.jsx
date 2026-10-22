import PlayerCard from "../../components/PlayerCard/PlayerCard";
import Podium from "../../components/Podium/Podium";
import RankingLayout from "../../components/RankingLayout/RankingLayout";
import { useVendorRanking } from "../../hooks/useVendorRanking";

const DEPARTMENT_LABELS = {
  sales: "Vendas",
  farm: "Farmer",
};

const PERIOD_LABELS = {
  week: "Semanal",
  all: "Geral",
};

export default function ScorerRankingScreen({ period, department }) {
  return (
    <RankingLayout
      title="Ranking de artilheiros"
      subtitle={`${DEPARTMENT_LABELS[department]} ${PERIOD_LABELS[period]}`}
      accent
      loadingText="Carregando artilheiros..."
    >
      <ScorerPodium period={period} department={department} />
    </RankingLayout>
  );
}

function ScorerPodium({ period, department }) {
  const { vendors } = useVendorRanking(period, department);

  return (
    <Podium
      items={vendors}
      emptyText="Nenhuma venda no período"
      renderItem={(vendor, index) => <PlayerCard player={vendor} position={index + 1} highlighted={index === 0} />}
    />
  );
}
