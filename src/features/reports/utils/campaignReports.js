import { formatPassageNames } from "../../admin/utils/passages";

const FUNNEL_LABELS = { sales: "Venda", farm: "Renovação" };
const STATUS_LABELS = { ativa: "Ativa", cancelada: "Cancelada" };
const KIND_LABELS = { vendor: "Vendedor", sdr: "Passagem" };

const dateOf = (value) => (value ? new Date(value) : null);
const dayOf = (value) => (value ? new Date(`${value}T12:00:00`) : null);
const sumOf = (rows, key) => Math.round(rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0) * 100) / 100;

export function salesSheet(sales) {
  const rows = sales.map((sale) => ({
    deal: sale.rdDealName ?? "",
    status: STATUS_LABELS[sale.dealStatus] ?? sale.dealStatus,
    value: sale.value,
    type: FUNNEL_LABELS[sale.funnelType] ?? sale.funnelType,
    segment: sale.segment?.toUpperCase() ?? "",
    vendor: sale.vendorId?.vendorName ?? "",
    passage: formatPassageNames(sale),
    date: dateOf(sale.realizedAt),
    id: sale.rdDealId,
  }));
  const active = rows.filter((row) => row.status === STATUS_LABELS.ativa);

  return {
    name: "Vendas",
    columns: [
      { header: "Negociação", key: "deal" },
      { header: "Status", key: "status" },
      { header: "Valor", key: "value", type: "money" },
      { header: "Tipo", key: "type" },
      { header: "Setor", key: "segment" },
      { header: "Vendedor", key: "vendor" },
      { header: "Passagem", key: "passage" },
      { header: "Data da venda", key: "date", type: "date", width: 18 },
      { header: "ID na RD", key: "id" },
    ],
    rows,
    totals: { deal: `Total das ativas (${active.length})`, value: sumOf(active, "value") },
  };
}

export function peopleSheet(points) {
  const teamName = new Map(points.teams.map((team) => [String(team.teamId), team.teamName]));
  const rows = points.people.map((person, index) => ({
    position: index + 1,
    name: person.name,
    kind: KIND_LABELS[person.kind] ?? person.kind,
    job: person.job ?? "",
    team: teamName.get(String(person.teamId)) ?? "Sem time",
    sales: person.sales,
    farm: person.farm,
    passage: person.passage,
    total: person.total,
  }));

  return {
    name: "Pontos por pessoa",
    columns: [
      { header: "Posição", key: "position", type: "integer" },
      { header: "Nome", key: "name" },
      { header: "Tipo", key: "kind" },
      { header: "Cargo", key: "job" },
      { header: "Time", key: "team" },
      { header: "Pontos de venda", key: "sales", type: "integer" },
      { header: "Pontos de renovação", key: "farm", type: "integer" },
      { header: "Pontos de passagem", key: "passage", type: "integer" },
      { header: "Total", key: "total", type: "integer" },
    ],
    rows,
  };
}

export function teamsSheet(scoreboard) {
  return {
    name: "Times",
    columns: [
      { header: "Posição", key: "position", type: "integer" },
      { header: "Time", key: "team" },
      { header: "Pontos de venda", key: "sales", type: "integer" },
      { header: "Pontos de renovação", key: "farm", type: "integer" },
      { header: "Pontos de passagem", key: "passage", type: "integer" },
      { header: "Total", key: "total", type: "integer" },
    ],
    rows: scoreboard.map((team, index) => ({
      position: index + 1,
      team: team.teamName,
      sales: team.sales,
      farm: team.farm,
      passage: team.passage,
      total: team.total,
    })),
  };
}

export function prizeBalanceSheet(prizes) {
  const teamName = new Map(prizes.teams.map((team) => [String(team.teamId), team.teamName]));
  return {
    name: "Saldo de prêmios",
    columns: [
      { header: "Nome", key: "name" },
      { header: "Tipo", key: "kind" },
      { header: "Cargo", key: "job" },
      { header: "Time", key: "team" },
      { header: "Pontos acumulados", key: "accumulated", type: "integer" },
      { header: "Pontos na semana", key: "currentWeek", type: "integer" },
      { header: "Prêmios ganhos", key: "earned", type: "integer" },
      { header: "Prêmios retirados", key: "withdrawn", type: "integer" },
      { header: "Saldo", key: "balance", type: "integer" },
      { header: "Pontos para o próximo", key: "pointsToNext", type: "integer" },
    ],
    rows: prizes.people.map((person) => ({
      name: person.name,
      kind: KIND_LABELS[person.kind] ?? person.kind,
      job: person.job ?? "",
      team: teamName.get(String(person.teamId)) ?? "Sem time",
      accumulated: person.accumulated,
      currentWeek: person.currentWeek,
      earned: person.earned,
      withdrawn: person.withdrawn,
      balance: person.balance,
      pointsToNext: person.pointsToNext,
    })),
  };
}

export function withdrawalsSheet(withdrawals) {
  return {
    name: "Retiradas",
    columns: [
      { header: "Dia", key: "day", type: "day", width: 14 },
      { header: "Nome", key: "name" },
      { header: "Cargo", key: "job" },
      { header: "Quantidade", key: "quantity", type: "integer" },
      { header: "Registrado por", key: "createdBy" },
    ],
    rows: withdrawals.map((withdrawal) => ({
      day: dayOf(withdrawal.withdrawnAt),
      name: withdrawal.name,
      job: withdrawal.job ?? "",
      quantity: withdrawal.quantity,
      createdBy: withdrawal.createdBy ?? "",
    })),
  };
}

export function summarySheet({ campaign, goal, segment, forecast }) {
  const segmentGoal = segment ? goal.segments?.[segment] : null;
  const target = segmentGoal ?? goal;
  const scenarios = forecast.campaign.scenarios;
  const rows = [
    { label: "Campanha", value: campaign ? `${campaign.name} (${campaign.start} a ${campaign.end})` : "" },
    { label: "Setor", value: segment ? segment.toUpperCase() : "Todos" },
    { label: "Meta", value: target.goal, type: "money" },
    { label: "Vendido", value: target.total, type: "money" },
    { label: "% da meta", value: (target.percent ?? 0) / 100, type: "percent" },
    { label: "Falta", value: Math.max(target.goal - target.total, 0), type: "money" },
    { label: "Previsão pessimista", value: scenarios.pessimistic, type: "money" },
    { label: "Previsão realista", value: scenarios.realistic, type: "money" },
    { label: "Previsão otimista", value: scenarios.optimistic, type: "money" },
    { label: "Ritmo atual (por dia)", value: forecast.campaign.pace.current, type: "money" },
    { label: "Ritmo necessário (por dia)", value: forecast.campaign.requiredPace, type: "money" },
    {
      label: "Chance de bater a meta",
      value: forecast.campaign.probability === null ? null : forecast.campaign.probability / 100,
      type: "percent",
    },
  ];
  return {
    name: "Resumo",
    columns: [
      { header: "Indicador", key: "label", width: 30 },
      { header: "Valor", key: "value", width: 36 },
    ],
    rows,
    cellTypes: rows.map((row) => row.type ?? null),
  };
}
