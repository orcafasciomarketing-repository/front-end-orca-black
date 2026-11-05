import { getPassagePeople } from "./passages";
import { addDays, filterSalesByWeek, getDayKey } from "./weeks";

const NO_SECTOR = "Sem setor";
const NO_NAME = "Sem nome";
const NO_TEAM = "Sem equipe";

export const isActiveSale = (sale) => sale.dealStatus === "ativa" && Boolean(sale.realizedAt);

export const segmentOf = (sale) => sale.segment?.toUpperCase() || NO_SECTOR;

export const funnelOf = (sale) => (sale.funnelType === "farm" ? "renewals" : "sales");

const byValueDesc = (a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR");

export function listDays(sales, weekKey, now = new Date()) {
  const today = getDayKey(now);
  const first = weekKey || sales.map((sale) => getDayKey(sale.realizedAt)).sort()[0];

  if (!first) {
    return [];
  }

  const last = weekKey ? addDays(weekKey, 6) : today;
  const end = last < today ? last : today;

  const days = [];
  for (let day = first; day <= end; day = addDays(day, 1)) {
    days.push(day);
  }

  return days;
}

export function formatDay(dayKey) {
  const [, month, day] = dayKey.split("-");
  return `${day}/${month}`;
}

function sumByDay(sales, days) {
  const totals = new Map(days.map((day) => [day, 0]));

  sales.forEach((sale) => {
    const day = getDayKey(sale.realizedAt);
    if (totals.has(day)) {
      totals.set(day, totals.get(day) + (sale.value ?? 0));
    }
  });

  return days.map((day) => totals.get(day));
}

function accumulate(values) {
  let total = 0;
  return values.map((value) => (total += value));
}

export function cumulativeByDay(sales, days) {
  return accumulate(sumByDay(sales, days));
}

function groupBy(sales, keyOf) {
  const groups = new Map();

  sales.forEach((sale) => {
    const key = keyOf(sale);
    groups.set(key, [...(groups.get(key) ?? []), sale]);
  });

  return groups;
}

export function cumulativeByDayAndGroup(sales, days, keyOf) {
  return [...groupBy(sales, keyOf)]
    .map(([key, groupSales]) => ({ key, label: key, values: cumulativeByDay(groupSales, days) }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function dailyByFunnel(sales, days) {
  const groups = groupBy(sales, funnelOf);

  return {
    sales: sumByDay(groups.get("sales") ?? [], days),
    renewals: sumByDay(groups.get("renewals") ?? [], days),
  };
}

export function totalsByVendor(sales) {
  const totals = new Map();

  sales.forEach((sale) => {
    const vendor = sale.vendorId;
    const key = vendor?._id ?? NO_NAME;
    const current = totals.get(key) ?? { key, label: vendor?.vendorName || NO_NAME, value: 0 };
    totals.set(key, { ...current, value: current.value + (sale.value ?? 0) });
  });

  return [...totals.values()].sort(byValueDesc);
}

export function totalsByTeam(sales, teams) {
  const teamNames = new Map(teams.map((team) => [team.teamId, team.teamName]));
  const totals = new Map(teams.map((team) => [team.teamId, { key: team.teamId, label: team.teamName, value: 0 }]));

  sales.forEach((sale) => {
    const teamId = sale.vendorId?.teamId;
    const key = teamNames.has(teamId) ? teamId : NO_TEAM;
    const current = totals.get(key) ?? { key, label: NO_TEAM, value: 0 };
    totals.set(key, { ...current, value: current.value + (sale.value ?? 0) });
  });

  return [...totals.values()].sort(byValueDesc);
}

export function passagesByPerson(sales) {
  const counts = new Map();

  sales.flatMap(getPassagePeople).forEach((person) => {
    const key = person._id ?? person.name ?? NO_NAME;
    const current = counts.get(key) ?? { key, label: person.name || NO_NAME, detail: person.job, value: 0 };
    counts.set(key, { ...current, value: current.value + 1 });
  });

  return [...counts.values()].sort(byValueDesc);
}

export function buildSalesCharts(sales, weekKey, now = new Date()) {
  const campaignSales = sales.filter(isActiveSale);
  const campaignDays = listDays(campaignSales, "", now);
  const activeSales = filterSalesByWeek(campaignSales, weekKey);
  const days = listDays(activeSales, weekKey, now);

  return {
    days,
    activeSales,
    total: cumulativeByDay(activeSales, days),
    bySegment: cumulativeByDayAndGroup(activeSales, days, segmentOf),
    byFunnel: dailyByFunnel(activeSales, days),
    byVendor: totalsByVendor(activeSales),
    passages: passagesByPerson(activeSales),
    campaign: { days: campaignDays, total: cumulativeByDay(campaignSales, campaignDays) },
  };
}
