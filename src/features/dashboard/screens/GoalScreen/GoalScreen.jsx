import styles from "./GoalScreen.module.css";

import { Suspense } from "react";

import GoalProgress from "../../components/GoalProgress/GoalProgress";
import { useGoal } from "../../hooks/useGoal";

export default function GoalScreen() {
  return (
    <section className={styles.screen}>
      <h1 className={styles.title}>Meta Black</h1>
      <div className={styles.content}>
        <Suspense fallback={<p className={styles.loading}>Carregando meta...</p>}>
          <GoalBoard />
        </Suspense>
      </div>
      <img className={styles.logo} src="/orca-black-logo.png" alt="Orça Black" />
    </section>
  );
}

function GoalBoard() {
  const { goal } = useGoal();

  return <GoalProgress total={goal.total} goal={goal.goal} percent={goal.percent} />;
}
