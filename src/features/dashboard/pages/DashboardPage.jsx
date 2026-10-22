import styles from "./DashboardPage.module.css";

import { useEffect, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import SalePopup from "../components/SalePopup/SalePopup";
import AssistRankingScreen from "../screens/AssistRankingScreen/AssistRankingScreen";
import GoalScreen from "../screens/GoalScreen/GoalScreen";
import ScorerRankingScreen from "../screens/ScorerRankingScreen/ScorerRankingScreen";
import TeamRankingScreen from "../screens/TeamRankingScreen/TeamRankingScreen";
import { useSaleQueue } from "../hooks/useSaleQueue";
import { useSalesEvents } from "../hooks/useSalesEvents";
import { useSaleVideo } from "../hooks/useSaleVideo";

const SCREENS = [
  { id: "goal", Screen: GoalScreen },
  { id: "team-ranking-week", Screen: TeamRankingScreen, props: { period: "week" } },
  { id: "team-ranking-all", Screen: TeamRankingScreen, props: { period: "all" } },
  { id: "scorer-farm-week", Screen: ScorerRankingScreen, props: { period: "week", department: "farm" } },
  { id: "scorer-sales-week", Screen: ScorerRankingScreen, props: { period: "week", department: "sales" } },
  { id: "scorer-farm-all", Screen: ScorerRankingScreen, props: { period: "all", department: "farm" } },
  { id: "scorer-sales-all", Screen: ScorerRankingScreen, props: { period: "all", department: "sales" } },
  { id: "assist-ranking", Screen: AssistRankingScreen, props: { period: "all" } },
];

const ROTATION_INTERVAL = 15 * 1000;

export default function DashboardPage() {
  const [activeIndex, setActiveIndex] = useState(0);

  const { currentItem, enqueueSale, dequeueSale } = useSaleQueue();
  const { videoUrl } = useSaleVideo();
  const paused = currentItem !== null;

  useSalesEvents(enqueueSale);

  useEffect(() => {
    if (SCREENS.length < 2 || paused) {
      return;
    }

    const intervalId = setInterval(() => {
      setActiveIndex((current) => (current + 1) % SCREENS.length);
    }, ROTATION_INTERVAL);

    return () => clearInterval(intervalId);
  }, [paused]);

  return (
    <section className={`container ${styles.dashboard}`}>
      {SCREENS.map(({ id, Screen, props }, index) => (
        <div
          key={id}
          className={`${styles.slide} ${index === activeIndex ? styles.active : ""}`}
          aria-hidden={index !== activeIndex}
          data-testid={`slide-${id}`}
        >
          <ErrorBoundary location={`Dashboard › tela "${id}"`}>
            <Screen {...props} />
          </ErrorBoundary>
        </div>
      ))}
      <ErrorBoundary location="Dashboard › popup de venda" className={styles.popupError}>
        <SalePopup item={currentItem} videoUrl={videoUrl} onFinish={dequeueSale} />
      </ErrorBoundary>
    </section>
  );
}
