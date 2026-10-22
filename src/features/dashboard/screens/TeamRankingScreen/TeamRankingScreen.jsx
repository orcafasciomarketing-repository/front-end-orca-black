import Podium from "../../components/Podium/Podium";
import RankingLayout from "../../components/RankingLayout/RankingLayout";
import TeamCard from "../../components/TeamCard/TeamCard";
import { useScoreboard } from "../../hooks/useScoreboard";

const PERIOD_LABELS = {
  week: "Semanal",
  all: "Geral acumulado",
};

export default function TeamRankingScreen({ period }) {
  return (
    <RankingLayout
      title="Ranking de equipes"
      subtitle={PERIOD_LABELS[period]}
      accent={period === "all"}
      loadingText="Carregando ranking..."
    >
      <TeamPodium period={period} />
    </RankingLayout>
  );
}

function TeamPodium({ period }) {
  const { teams } = useScoreboard(period);

  return (
    <Podium
      items={teams}
      emptyText="Nenhum time cadastrado"
      renderItem={(team, index) => <TeamCard team={team} highlighted={index === 0} />}
    />
  );
}
