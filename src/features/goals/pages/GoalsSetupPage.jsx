import styles from "./GoalsPages.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import PageHeader from "../../admin/components/PageHeader/PageHeader";
import WidgetFallback from "../../admin/components/WidgetFallback/WidgetFallback";
import GoalSetupForm from "../components/GoalSetupForm/GoalSetupForm";
import { useGoalMonth, useGoalMutations } from "../hooks/useGoals";
import { currentMonthKey } from "../utils/goalMath";

const SEGMENTS = [
  { value: "b2b", label: "B2B" },
  { value: "b2g", label: "B2G" },
];

export default function GoalsSetupPage() {
  const [month, setMonth] = useState(() => currentMonthKey());
  const [segment, setSegment] = useState("b2b");
  const { save, remove } = useGoalMutations();

  const changeMonth = (value) => {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    save.reset();
    remove.reset();
    setMonth(value);
  };

  const changeSegment = (value) => {
    save.reset();
    remove.reset();
    setSegment(value);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Cadastro de metas"
        description="Meta do setor, níveis de senioridade e a meta de cada vendedor no mês"
      >
        <label className={styles.field}>
          <span className={styles.label}>Mês</span>
          <input
            className={styles.input}
            type="month"
            value={month}
            aria-label="Mês das metas"
            onChange={(event) => changeMonth(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Setor</span>
          <select
            className={styles.select}
            value={segment}
            aria-label="Setor das metas"
            onChange={(event) => changeSegment(event.target.value)}
          >
            {SEGMENTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </PageHeader>
      <ErrorBoundary key={month} location="Admin › cadastro de metas">
        <Suspense fallback={<WidgetFallback title="Metas do mês" />}>
          <SetupContent month={month} segment={segment} save={save} remove={remove} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function SetupContent({ month, segment, save, remove }) {
  const { goalMonth } = useGoalMonth(month);
  const segmentData = goalMonth.segments[segment];

  if (!goalMonth.weeks.length) {
    return <p className={styles.empty}>Mês sem semanas</p>;
  }

  return (
    <GoalSetupForm
      key={`${month}-${segment}-${segmentData.config?.updatedAt ?? "novo"}`}
      month={month}
      segment={segment}
      weeks={goalMonth.weeks}
      segmentData={segmentData}
      save={save}
      remove={remove}
    />
  );
}
