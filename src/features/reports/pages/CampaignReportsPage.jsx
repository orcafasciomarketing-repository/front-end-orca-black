import styles from "./ReportsPage.module.css";

import { Suspense, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import usePermissions from "../../auth/hooks/usePermissions";
import { getForecast } from "../../admin/api/forecastApi";
import { getPeoplePoints } from "../../admin/api/pointsApi";
import { getPrizes, getPrizeWithdrawals } from "../../admin/api/prizesApi";
import { getAdminSales, getGoal } from "../../admin/api/slidesApi";
import PageHeader from "../../admin/components/PageHeader/PageHeader";
import PeriodFilter from "../../admin/components/PeriodFilter/PeriodFilter";
import WidgetFallback from "../../admin/components/WidgetFallback/WidgetFallback";
import { ALL_PERIODS, filterSalesByPeriod, resolvePeriod } from "../../admin/utils/periods";
import { filterSalesBySegment, getSegmentOptions } from "../../admin/utils/segments";
import { useCampaignOptions } from "../../campaigns/hooks/useCampaigns";
import { campaignKey, useSelectedCampaign } from "../../campaigns/utils/campaignSelection";
import { formatShortDay } from "../../goals/utils/goalMath";
import { getFullScoreboard } from "../api/reportsApi";
import ReportCard from "../components/ReportCard/ReportCard";
import ReportPreview, { ReportSection, ReportTable, ReportTiles } from "../components/ReportPreview/ReportPreview";
import {
  peopleSheet,
  prizeBalanceSheet,
  salesSheet,
  summarySheet,
  teamsSheet,
  withdrawalsSheet,
} from "../utils/campaignReports";
import { reportFileName } from "../utils/xlsx";

const formatPercent = (value) => `${(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const formatDay = (day) => (day ? `${formatShortDay(day)}/${day.slice(0, 4)}` : "");
const formatPoints = (value) => `${value} ${value === 1 ? "ponto" : "pontos"}`;

export default function CampaignReportsPage() {
  const { segment: userSegment } = usePermissions();
  const [segment, setSegment] = useState(userSegment);
  const [periodSelection, setPeriodSelection] = useState(ALL_PERIODS);
  const period = useMemo(() => resolvePeriod(periodSelection), [periodSelection]);
  const campaignId = useSelectedCampaign();
  const { campaigns } = useCampaignOptions();
  const campaign = campaigns?.find((item) => (campaignId ? item.id === campaignId : item.active)) ?? null;
  const [preview, setPreview] = useState(false);
  const lower = segment ? segment.toLowerCase() : "";
  const fileParts = [campaign?.name, segment, period?.key];

  const reports = [
    {
      title: "Vendas",
      description:
        "Todas as vendas da campanha no período e no setor escolhidos, com status, valor, tipo, vendedor, passagem e data. A última linha soma as vendas ativas.",
      excel: async () => {
        const { sales } = await getAdminSales("", campaignId);
        return {
          fileName: reportFileName("vendas", fileParts),
          sheets: [salesSheet(filterSalesBySegment(filterSalesByPeriod(sales, period), segment))],
        };
      },
    },
    {
      title: "Pontos e ranking",
      description:
        "Pontos de cada pessoa (venda, renovação e passagem) no período e no setor escolhidos, e o placar dos times na campanha toda.",
      excel: async () => {
        const [points, scoreboard] = await Promise.all([
          getPeoplePoints({ segment, from: period?.start ?? "", to: period?.end ?? "", campaign: campaignId }),
          getFullScoreboard(campaignId),
        ]);
        return { fileName: reportFileName("pontos", fileParts), sheets: [peopleSheet(points), teamsSheet(scoreboard)] };
      },
    },
    {
      title: "Prêmios",
      description: "Saldo de prêmios de cada pessoa na campanha e todas as retiradas registradas.",
      excel: async () => {
        const [prizes, withdrawals] = await Promise.all([
          getPrizes(segment, campaignId),
          getPrizeWithdrawals(segment, campaignId),
        ]);
        return {
          fileName: reportFileName("premios", [campaign?.name, segment]),
          sheets: [prizeBalanceSheet(prizes), withdrawalsSheet(withdrawals)],
        };
      },
    },
    {
      title: "Resumo da campanha",
      description:
        "Meta, vendido, previsão, metas por setor, placar dos times e as 10 pessoas com mais pontos. Em PDF, pronto para enviar ou apresentar; em Excel, os números do resumo.",
      excel: async () => {
        const [goal, forecast] = await Promise.all([getGoal(campaignId), getForecast(segment, null, campaignId)]);
        return {
          fileName: reportFileName("resumo-campanha", [campaign?.name, segment]),
          sheets: [summarySheet({ campaign, goal, segment: lower, forecast })],
        };
      },
      onPdf: () => setPreview(true),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Relatórios da campanha"
        description="Gere planilhas em Excel e relatórios em PDF da campanha escolhida no menu"
      >
        <div className={styles.controls}>
          <PeriodFilter selection={periodSelection} onChange={setPeriodSelection} ariaLabel="Período dos relatórios" />
          <label className={styles.field}>
            <span className={styles.label}>Setor</span>
            <select
              className={styles.select}
              aria-label="Setor dos relatórios"
              value={segment}
              disabled={!!userSegment}
              onChange={(event) => setSegment(event.target.value)}
            >
              {getSegmentOptions(userSegment).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PageHeader>
      <p className={styles.context}>
        Campanha: <strong>{campaign?.name ?? "carregando..."}</strong>
        {campaign && ` (${formatDay(campaign.start)} a ${formatDay(campaign.end)})`} · Período:{" "}
        <strong>{period?.label ?? "Todo o período"}</strong> · Setor: <strong>{segment || "Todos"}</strong>
      </p>
      <div className={styles.cards}>
        {reports.map((report) => (
          <ReportCard key={report.title} {...report} />
        ))}
      </div>
      {preview && (
        <ErrorBoundary location="Relatórios › resumo da campanha">
          <Suspense fallback={<WidgetFallback title="Resumo da campanha" />}>
            <CampaignSummaryReport
              campaign={campaign}
              campaignId={campaignId}
              segment={segment}
              onClose={() => setPreview(false)}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

function CampaignSummaryReport({ campaign, campaignId, segment, onClose }) {
  const key = campaignKey(campaignId);
  const { data } = useSuspenseQuery({
    queryKey: ["admin-report-campaign", key, segment || "all"],
    queryFn: async () => {
      const [goal, forecast, scoreboard, points, prizes] = await Promise.all([
        getGoal(campaignId),
        getForecast(segment, null, campaignId),
        getFullScoreboard(campaignId),
        getPeoplePoints({ segment, campaign: campaignId }),
        getPrizes(segment, campaignId),
      ]);
      return { goal, forecast, scoreboard, points, prizes };
    },
  });
  const { goal, forecast, scoreboard, points, prizes } = data;
  const target = segment ? (goal.segments?.[segment.toLowerCase()] ?? goal) : goal;
  const { scenarios, pace, requiredPace, probability } = forecast.campaign;
  const teamName = new Map(points.teams.map((team) => [String(team.teamId), team.teamName]));
  const sumOf = (key) => prizes.people.reduce((total, person) => total + person[key], 0);

  return (
    <ReportPreview
      title={`Relatório da campanha · ${campaign?.name ?? ""}`}
      details={[
        campaign && `${formatDay(campaign.start)} a ${formatDay(campaign.end)}`,
        `Setor: ${segment || "Todos"}`,
      ]}
      onClose={onClose}
    >
      <ReportSection title="Meta">
        <ReportTiles
          label="Meta da campanha"
          items={[
            { label: "Meta", value: formatCurrency(target.goal) },
            { label: "Vendido", value: formatCurrency(target.total) },
            { label: "% da meta", value: formatPercent(target.percent) },
            { label: "Falta", value: formatCurrency(Math.max(target.goal - target.total, 0)) },
          ]}
        />
      </ReportSection>
      <ReportSection title="Previsão">
        <ReportTiles
          label="Previsão da campanha"
          items={[
            { label: "Pessimista", value: formatCurrency(scenarios.pessimistic) },
            { label: "Realista", value: formatCurrency(scenarios.realistic) },
            { label: "Otimista", value: formatCurrency(scenarios.optimistic) },
            { label: "Ritmo atual", value: `${formatCurrency(pace.current)}/dia` },
            {
              label: "Ritmo necessário",
              value: requiredPace === null ? "—" : `${formatCurrency(requiredPace)}/dia`,
            },
            { label: "Chance de bater", value: probability === null ? "—" : formatPercent(probability) },
          ]}
        />
      </ReportSection>
      {!segment && goal.segments && (
        <ReportSection title="Por setor">
          <ReportTable
            label="Meta por setor"
            columns={[
              { key: "segment", header: "Setor" },
              { key: "goal", header: "Meta", number: true },
              { key: "total", header: "Vendido", number: true },
              { key: "percent", header: "% da meta", number: true },
            ]}
            rows={Object.entries(goal.segments).map(([name, item]) => ({
              key: name,
              segment: name.toUpperCase(),
              goal: formatCurrency(item.goal),
              total: formatCurrency(item.total),
              percent: formatPercent(item.percent),
            }))}
          />
        </ReportSection>
      )}
      <ReportSection title="Placar dos times">
        <ReportTable
          label="Placar dos times"
          columns={[
            { key: "position", header: "Posição" },
            { key: "team", header: "Time" },
            { key: "sales", header: "Venda", number: true },
            { key: "farm", header: "Renovação", number: true },
            { key: "passage", header: "Passagem", number: true },
            { key: "total", header: "Total", number: true },
          ]}
          rows={scoreboard.map((team, index) => ({
            key: String(team.teamId),
            position: `${index + 1}º`,
            team: team.teamName,
            sales: team.sales,
            farm: team.farm,
            passage: team.passage,
            total: formatPoints(team.total),
          }))}
        />
      </ReportSection>
      <ReportSection title="As 10 pessoas com mais pontos">
        <ReportTable
          label="As 10 pessoas com mais pontos"
          columns={[
            { key: "position", header: "Posição" },
            { key: "name", header: "Nome" },
            { key: "job", header: "Cargo" },
            { key: "team", header: "Time" },
            { key: "total", header: "Pontos", number: true },
          ]}
          rows={points.people
            .filter((person) => person.total > 0)
            .slice(0, 10)
            .map((person, index) => ({
              key: `${person.kind}-${person.personId}`,
              position: `${index + 1}º`,
              name: person.name,
              job: person.job ?? "",
              team: teamName.get(String(person.teamId)) ?? "Sem time",
              total: person.total,
            }))}
          empty="Ninguém pontuou ainda"
        />
      </ReportSection>
      <ReportSection title="Prêmios">
        <ReportTiles
          label="Prêmios da campanha"
          items={[
            { label: "Prêmios ganhos", value: String(sumOf("earned")) },
            { label: "Prêmios retirados", value: String(sumOf("withdrawn")) },
            { label: "Saldo a retirar", value: String(Math.max(sumOf("earned") - sumOf("withdrawn"), 0)) },
            { label: "Pontos por prêmio", value: String(prizes.step) },
          ]}
        />
      </ReportSection>
    </ReportPreview>
  );
}
