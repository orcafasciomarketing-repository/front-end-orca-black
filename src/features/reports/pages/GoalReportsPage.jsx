import styles from "./ReportsPage.module.css";

import { Suspense, useState } from "react";
import { useSearchParams } from "react-router";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import PageHeader from "../../admin/components/PageHeader/PageHeader";
import WidgetFallback from "../../admin/components/WidgetFallback/WidgetFallback";
import { getGoalProgress } from "../../goals/api/goalsApi";
import GoalBreakdown from "../../goals/components/GoalBreakdown/GoalBreakdown";
import TierProgressCard from "../../goals/components/TierProgressCard/TierProgressCard";
import { useGoalProgress } from "../../goals/hooks/useGoals";
import {
  currentMonthKey,
  formatMonth,
  formatShortDay,
  goalPerWorkday,
  STATUS_LABELS,
  TIER_LABELS,
} from "../../goals/utils/goalMath";
import ReportCard from "../components/ReportCard/ReportCard";
import ReportPreview, { ReportSection, ReportTable, ReportTiles } from "../components/ReportPreview/ReportPreview";
import { goalSheets, peopleOfSegment } from "../utils/goalReports";
import { reportFileName } from "../utils/xlsx";

const SEGMENTS = [
  { value: "", label: "Todos" },
  { value: "b2b", label: "B2B" },
  { value: "b2g", label: "B2G" },
];

const PART_LABELS = { farm: "Farmer", sales: "Venda" };

const formatPercent = (value) => `${(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const shareOf = (scope) => (scope.tiers.goal > 0 ? (scope.realized / scope.tiers.goal) * 100 : 0);
const weekLabel = (week) => `Semana ${week.index + 1} · ${formatShortDay(week.start)} a ${formatShortDay(week.end)}`;

export default function GoalReportsPage() {
  const [searchParams] = useSearchParams();
  const [month, setMonth] = useState(() =>
    /^\d{4}-\d{2}$/.test(searchParams.get("mes") ?? "") ? searchParams.get("mes") : currentMonthKey(),
  );
  const [segment, setSegment] = useState("");
  const [preview, setPreview] = useState(null);
  const label = SEGMENTS.find((option) => option.value === segment).label;

  return (
    <div className={styles.page}>
      <PageHeader title="Relatórios de metas" description="Planilhas em Excel e relatórios em PDF das metas do mês">
        <div className={styles.controls}>
          <label className={styles.field}>
            <span className={styles.label}>Mês</span>
            <input
              className={styles.input}
              type="month"
              value={month}
              aria-label="Mês dos relatórios"
              onChange={(event) => {
                if (/^\d{4}-\d{2}$/.test(event.target.value)) {
                  setMonth(event.target.value);
                  setPreview(null);
                }
              }}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Setor</span>
            <select
              className={styles.select}
              aria-label="Setor dos relatórios"
              value={segment}
              onChange={(event) => {
                setSegment(event.target.value);
                setPreview(null);
              }}
            >
              {SEGMENTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PageHeader>
      <p className={styles.context}>
        Mês: <strong>{formatMonth(month)}</strong> · Setor: <strong>{label}</strong>
      </p>
      <ErrorBoundary key={month} location="Relatórios › metas">
        <Suspense fallback={<WidgetFallback title="Relatórios de metas" />}>
          <GoalReports month={month} segment={segment} preview={preview} setPreview={setPreview} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function GoalReports({ month, segment, preview, setPreview }) {
  const { progress } = useGoalProgress(month);
  const people = [...peopleOfSegment(progress, segment)].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const [vendorId, setVendorId] = useState("");
  const selectedId = people.some((person) => person.vendorId === vendorId) ? vendorId : (people[0]?.vendorId ?? "");
  const segmentLabel = segment ? segment.toUpperCase() : "Todos";

  if (!progress.people.length) {
    return (
      <section className="widget">
        <p className={styles.context}>Sem metas cadastradas em {formatMonth(month)}.</p>
      </section>
    );
  }

  return (
    <>
      <div className={styles.cards}>
        <ReportCard
          title="Metas do mês"
          description="Planilha com uma aba por assunto: cada vendedor (faixas, realizado, %, quanto falta, situação, por dia útil, vendas e leads que faltam, chance e previsão), as semanas de cada vendedor, os setores com Farmer e Venda e os times."
          excel={async () => ({
            fileName: reportFileName("metas", [month, segment]),
            sheets: goalSheets(await getGoalProgress(month), segment),
          })}
          onPdf={() => setPreview({ type: "month" })}
        />
        <ReportCard
          title="Relatório de um vendedor"
          description="As faixas do mês, a previsão, o que falta (vendas, leads e a meta por origem) e as semanas de uma pessoa, em PDF."
          onPdf={selectedId ? () => setPreview({ type: "vendor", vendorId: selectedId }) : null}
        >
          <label className={styles.field}>
            <span className={styles.label}>Vendedor</span>
            <select
              className={styles.select}
              aria-label="Vendedor do relatório"
              value={selectedId}
              onChange={(event) => setVendorId(event.target.value)}
            >
              {people.map((person) => (
                <option key={person.vendorId} value={person.vendorId}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
        </ReportCard>
      </div>
      {preview?.type === "month" && (
        <MonthReport
          progress={progress}
          segment={segment}
          segmentLabel={segmentLabel}
          onClose={() => setPreview(null)}
        />
      )}
      {preview?.type === "vendor" && (
        <VendorReport
          progress={progress}
          person={progress.people.find((person) => person.vendorId === preview.vendorId)}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}

function MonthReport({ progress, segment, segmentLabel, onClose }) {
  const hasBlack = Boolean(progress.black?.active);
  const people = peopleOfSegment(progress, segment);
  const scope = segment ? progress.segments.find((item) => item.segment === segment) : progress.total;
  const tierCols = [
    { key: "goal", header: "Meta", number: true },
    { key: "super", header: "Super", number: true },
    ...(hasBlack ? [{ key: "black", header: "Black", number: true }] : []),
  ];
  const tierCells = (tiers) => ({
    goal: formatCurrency(tiers.goal),
    super: formatCurrency(tiers.super),
    black: formatCurrency(tiers.black),
  });
  const reached = (tier) => people.filter((person) => person.month.reached.includes(tier)).length;

  return (
    <ReportPreview
      title={`Relatório de metas · ${formatMonth(progress.month)}`}
      details={[`Setor: ${segmentLabel}`]}
      onClose={onClose}
    >
      {scope && (
        <ReportSection title="Resumo">
          <ReportTiles
            label="Resumo do mês"
            items={[
              { label: "Vendedores com meta", value: String(people.length) },
              { label: "Meta", value: formatCurrency(scope.month.tiers.goal) },
              {
                label: "Realizado",
                value: formatCurrency(scope.month.realized),
                hint: `${formatPercent(shareOf(scope.month))} da Meta`,
              },
              {
                label: "Previsão realista",
                value: scope.forecast ? formatCurrency(scope.forecast.scenarios.realistic) : "—",
              },
              { label: "Bateram a Meta", value: String(reached("goal")) },
              { label: "Bateram a Super", value: String(reached("super")) },
              ...(hasBlack ? [{ label: "Bateram a Black", value: String(reached("black")) }] : []),
            ]}
          />
        </ReportSection>
      )}
      <ReportSection title="Setores">
        <ReportTable
          label="Setores"
          columns={[
            { key: "segment", header: "Setor" },
            { key: "part", header: "Parte" },
            ...tierCols,
            { key: "realized", header: "Realizado", number: true },
            { key: "percent", header: "% da Meta", number: true },
          ]}
          rows={progress.segments
            .filter((item) => !segment || item.segment === segment)
            .flatMap((item) =>
              [
                ["Total", item.month],
                ["Farmer", item.parts.farm],
                ["Venda", item.parts.sales],
              ].map(([part, value]) => ({
                key: `${item.segment}-${part}`,
                segment: item.segment.toUpperCase(),
                part,
                ...tierCells(value.tiers),
                realized: formatCurrency(value.realized),
                percent: formatPercent(shareOf(value)),
              })),
            )}
        />
      </ReportSection>
      <ReportSection title="Vendedores">
        <ReportTable
          label="Vendedores"
          columns={[
            { key: "name", header: "Vendedor" },
            { key: "part", header: "Conta" },
            ...tierCols,
            { key: "realized", header: "Realizado", number: true },
            { key: "percent", header: "% da Meta", number: true },
            { key: "current", header: "Faixa atual" },
            { key: "status", header: "Situação" },
          ]}
          rows={people.map((person) => ({
            key: person.vendorId,
            name: person.name,
            part: `${person.segment.toUpperCase()} ${PART_LABELS[person.type]}`,
            ...tierCells(person.month.tiers),
            realized: formatCurrency(person.month.realized),
            percent: formatPercent(shareOf(person.month)),
            current: TIER_LABELS[person.month.current],
            status: STATUS_LABELS[person.month.pace.status],
          }))}
        />
      </ReportSection>
    </ReportPreview>
  );
}

function VendorReport({ progress, person, onClose }) {
  if (!person) return null;
  const hasBlack = Boolean(progress.black?.active);
  const weekIndex = person.weeks.findIndex((week) => progress.today >= week.start && progress.today <= week.end);
  const week = weekIndex >= 0 ? person.weeks[weekIndex] : null;

  return (
    <ReportPreview
      title={`Relatório de metas · ${person.name}`}
      details={[
        formatMonth(progress.month),
        [person.job, person.levelName, person.segment.toUpperCase(), person.teamName].filter(Boolean).join(" · "),
      ]}
      onClose={onClose}
    >
      <ReportSection title="Faixas do mês">
        <div className={styles.tierCards}>
          {person.month.available.map((tier) => (
            <TierProgressCard key={tier} tier={tier} progress={person.month} forecast={person.forecast} />
          ))}
        </div>
      </ReportSection>
      {person.forecast && (
        <ReportSection title="Previsão do mês">
          <ReportTiles
            label="Previsão do mês"
            items={[
              { label: "Pessimista", value: formatCurrency(person.forecast.scenarios.pessimistic) },
              { label: "Realista", value: formatCurrency(person.forecast.scenarios.realistic) },
              { label: "Otimista", value: formatCurrency(person.forecast.scenarios.optimistic) },
              { label: "Ritmo atual", value: `${formatCurrency(person.forecast.pace.current)}/dia` },
            ]}
          />
        </ReportSection>
      )}
      <GoalBreakdown person={person} week={week} />
      <ReportSection title="Semanas">
        <ReportTable
          label="Semanas"
          columns={[
            { key: "week", header: "Semana" },
            { key: "goal", header: "Meta", number: true },
            { key: "super", header: "Super", number: true },
            ...(hasBlack ? [{ key: "black", header: "Black", number: true }] : []),
            { key: "perDay", header: "Meta por dia útil", number: true },
            { key: "realized", header: "Realizado", number: true },
            { key: "current", header: "Faixa atual" },
            { key: "status", header: "Situação" },
          ]}
          rows={person.weeks.map((item) => ({
            key: item.start,
            week: weekLabel(item),
            goal: formatCurrency(item.tiers.goal),
            super: formatCurrency(item.tiers.super),
            black: formatCurrency(item.tiers.black),
            perDay: formatCurrency(goalPerWorkday(item)),
            realized: formatCurrency(item.realized),
            current: TIER_LABELS[item.current],
            status: STATUS_LABELS[item.pace.status],
          }))}
        />
      </ReportSection>
    </ReportPreview>
  );
}
