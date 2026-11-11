import styles from "./GoalsPages.module.css";
import own from "./GoalsListPage.module.css";

import { Fragment, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import PageHeader from "../../admin/components/PageHeader/PageHeader";
import WidgetFallback from "../../admin/components/WidgetFallback/WidgetFallback";
import { formatDateTime } from "../../admin/utils/formatDateTime";
import usePermissions from "../../auth/hooks/usePermissions";
import { getGoalErrorMessage } from "../api/goalsApi";
import GoalVisibilityEditor from "../components/GoalVisibilityEditor/GoalVisibilityEditor";
import { useGoalList, useGoalMutations } from "../hooks/useGoals";
import { currentMonthKey, formatMonth } from "../utils/goalMath";
import { visibilitySummary } from "../utils/goalVisibility";

const SEGMENT_LABELS = { b2b: "B2B", b2g: "B2G" };

const SEGMENT_FILTERS = [
  { value: "", label: "Todos" },
  { value: "b2b", label: "B2B" },
  { value: "b2g", label: "B2G" },
];

const nextMonthKey = (month) => {
  const [year, number] = month.split("-").map(Number);
  return number === 12
    ? `${year + 1}-01`
    : `${year}-${String(number + 1).padStart(2, "0")}`;
};

const setupPath = (month, segment) =>
  `/admin/metas?mes=${month}&setor=${segment}`;

const periodOf = (month, current) => {
  if (month === current) return { label: "Atual", className: own.current };
  return month > current ? { label: "Futuro", className: own.future } : null;
};

export default function GoalsListPage() {
  const [segment, setSegment] = useState("");

  return (
    <div className={styles.page}>
      <PageHeader
        title="Metas cadastradas"
        description="Metas mensais do B2B e do B2G: editar, excluir, cadastrar meses futuros e escolher o que os vendedores veem"
      >
        <label className={styles.field}>
          <span className={styles.label}>Setor</span>
          <select
            className={styles.select}
            value={segment}
            aria-label="Setor das metas cadastradas"
            onChange={(event) => setSegment(event.target.value)}
          >
            {SEGMENT_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </PageHeader>
      <NewGoalForm />
      <ErrorBoundary location="Admin › metas cadastradas">
        <Suspense fallback={<WidgetFallback title="Metas cadastradas" />}>
          <GoalsList segment={segment} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function NewGoalForm() {
  const { goalSegments } = usePermissions();
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => nextMonthKey(currentMonthKey()));
  const [segment, setSegment] = useState(goalSegments[0] ?? "");

  if (!goalSegments.length) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate(setupPath(month, segment));
  };

  return (
    <form
      className={own.newGoal}
      onSubmit={handleSubmit}
      aria-label="Cadastrar meta"
    >
      <div className={own.newGoalText}>
        <h2 className={own.newGoalTitle}>Cadastrar meta</h2>
        <p className={own.hint}>
          Escolha o mês (pode ser um mês futuro) e o setor; o cadastro abre já
          com eles
        </p>
      </div>
      <label className={styles.field}>
        <span className={styles.label}>Mês</span>
        <input
          className={styles.input}
          type="month"
          required
          value={month}
          aria-label="Mês da nova meta"
          onChange={(event) =>
            /^\d{4}-\d{2}$/.test(event.target.value) &&
            setMonth(event.target.value)
          }
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Setor</span>
        <select
          className={styles.select}
          value={segment}
          aria-label="Setor da nova meta"
          onChange={(event) => setSegment(event.target.value)}
        >
          {goalSegments.map((value) => (
            <option key={value} value={value}>
              {SEGMENT_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <button className={own.primaryButton} type="submit">
        Abrir cadastro
      </button>
    </form>
  );
}

function GoalsList({ segment }) {
  const { goals } = useGoalList();
  const { goalSegments } = usePermissions();
  const { remove, visibility } = useGoalMutations();
  const [editing, setEditing] = useState(null);
  const current = currentMonthKey();
  const rows = goals.filter((item) => !segment || item.segment === segment);
  const keyOf = (item) => `${item.month}-${item.segment}`;

  const handleDelete = (item) => {
    const label = `${SEGMENT_LABELS[item.segment]} de ${formatMonth(item.month)}`;
    if (
      !window.confirm(
        `Excluir as metas do ${label}? Os vendedores deixam de ver esse mês.`,
      )
    )
      return;
    visibility.reset();
    remove.mutate({ month: item.month, segment: item.segment });
  };

  const toggleEditor = (item) => {
    visibility.reset();
    setEditing((previous) => (previous === keyOf(item) ? null : keyOf(item)));
  };

  return (
    <section className="widget" aria-label="Metas cadastradas">
      <header className="header">
        <h2 className="title">Metas cadastradas</h2>
        <span className={own.count}>{rows.length}</span>
      </header>
      {remove.isError && (
        <p className={own.error}>
          Não foi possível excluir: {getGoalErrorMessage(remove.error)}
        </p>
      )}
      {rows.length === 0 ? (
        <p className={styles.empty}>
          Nenhuma meta cadastrada{segment && ` no ${SEGMENT_LABELS[segment]}`}
        </p>
      ) : (
        <div className={styles.scroll}>
          <table
            className={styles.table}
            aria-label="Lista de metas cadastradas"
          >
            <thead>
              <tr>
                <th scope="col">Mês</th>
                <th scope="col">Setor</th>
                <th scope="col" className={styles.number}>
                  Meta
                </th>
                <th scope="col" className={styles.number}>
                  Super meta
                </th>
                <th scope="col" className={styles.number}>
                  Meta black
                </th>
                <th scope="col" className={styles.number}>
                  Pessoas
                </th>
                <th scope="col">Vendedores veem</th>
                <th scope="col">Atualizado</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const canManage = goalSegments.includes(item.segment);
                const isEditing = editing === keyOf(item);
                const period = periodOf(item.month, current);
                const label = `${SEGMENT_LABELS[item.segment]} de ${formatMonth(item.month)}`;
                const lockedHint = `Só quem gerencia o ${SEGMENT_LABELS[item.segment]} altera`;
                return (
                  <Fragment key={keyOf(item)}>
                    <tr className={isEditing ? styles.selected : undefined}>
                      <th scope="row">
                        <span className={own.month}>
                          {formatMonth(item.month)}
                          {period && (
                            <span
                              className={`${own.badge} ${period.className}`}
                            >
                              {period.label}
                            </span>
                          )}
                        </span>
                      </th>
                      <td>{SEGMENT_LABELS[item.segment]}</td>
                      <td className={styles.number}>
                        {formatCurrency(item.tiers.goal)}
                      </td>
                      <td className={styles.number}>
                        {formatCurrency(item.tiers.super)}
                      </td>
                      <td className={styles.number}>
                        {item.tiers.black > 0
                          ? formatCurrency(item.tiers.black)
                          : "—"}
                      </td>
                      <td className={styles.number}>{item.people}</td>
                      <td>
                        <span
                          className={
                            item.visibility.open ? undefined : own.closed
                          }
                        >
                          {visibilitySummary(item.visibility)}
                        </span>
                      </td>
                      <td className={own.updated}>
                        {item.updatedAt ? formatDateTime(item.updatedAt) : "—"}
                        {item.updatedBy && (
                          <small className={own.hint}>{item.updatedBy}</small>
                        )}
                      </td>
                      <td>
                        <div className={own.actions}>
                          {canManage ? (
                            <Link
                              className={own.secondaryButton}
                              to={setupPath(item.month, item.segment)}
                              aria-label={`Editar ${label}`}
                            >
                              Editar
                            </Link>
                          ) : (
                            <span className={own.locked} title={lockedHint}>
                              Só visualização
                            </span>
                          )}
                          <button
                            className={own.secondaryButton}
                            type="button"
                            disabled={!canManage}
                            title={canManage ? undefined : lockedHint}
                            aria-expanded={isEditing}
                            aria-label={`O que os vendedores veem: ${label}`}
                            onClick={() => toggleEditor(item)}
                          >
                            Vendedores veem
                          </button>
                          <button
                            className={own.dangerButton}
                            type="button"
                            disabled={!canManage || remove.isPending}
                            title={canManage ? undefined : lockedHint}
                            aria-label={`Excluir ${label}`}
                            onClick={() => handleDelete(item)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isEditing && (
                      <tr>
                        <td colSpan={9} className={own.editorCell}>
                          <GoalVisibilityEditor
                            title={`O que os vendedores veem: ${label}`}
                            visibility={item.visibility}
                            mutation={visibility}
                            onSave={(value) =>
                              visibility.mutate({
                                month: item.month,
                                segment: item.segment,
                                visibility: value,
                              })
                            }
                            onCancel={() => toggleEditor(item)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
