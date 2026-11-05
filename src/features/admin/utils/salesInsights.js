import { funnelOf, isActiveSale, segmentOf, totalsByVendor } from "./chartData";
import {
  addDays,
  daysBetween,
  filterSalesByWeek,
  getDayKey,
  getWeekKey,
  getWeekdayAndHour,
  previousWeekKey,
} from "./weeks";

const NO_NAME = "Sem nome";
const TOP_VENDORS = 3;

export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const sumValues = (sales) => sales.reduce((total, sale) => total + (sale.value ?? 0), 0);

const byValueDesc = (a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR");

const salesCountLabel = (count) => `${count} ${count === 1 ? "venda" : "vendas"}`;

export function summarize(sales) {
  const total = sumValues(sales);

  return {
    total,
    count: sales.length,
    average: sales.length ? total / sales.length : 0,
  };
}

export function variation(current, previous) {
  if (!previous) {
    return null;
  }

  return (current - previous) / previous;
}

export function buildKpis(activeSales, weekKey) {
  const current = summarize(filterSalesByWeek(activeSales, weekKey));

  if (!weekKey) {
    return { current, previous: null };
  }

  return {
    current,
    previous: summarize(filterSalesByWeek(activeSales, previousWeekKey(weekKey))),
  };
}

export function averageTicketBy(sales, keyOf, labelOf) {
  const groups = new Map();

  sales.forEach((sale) => {
    const key = keyOf(sale);
    const current = groups.get(key) ?? {
      key,
      label: labelOf(sale),
      total: 0,
      count: 0,
    };
    groups.set(key, {
      ...current,
      total: current.total + (sale.value ?? 0),
      count: current.count + 1,
    });
  });

  return [...groups.values()]
    .map(({ key, label, total, count }) => ({
      key,
      label,
      value: total / count,
      detail: salesCountLabel(count),
    }))
    .sort(byValueDesc);
}

export const ticketBySegment = (sales) => averageTicketBy(sales, segmentOf, segmentOf);

export const ticketByVendor = (sales) =>
  averageTicketBy(
    sales,
    (sale) => sale.vendorId?._id ?? NO_NAME,
    (sale) => sale.vendorId?.vendorName || NO_NAME,
  );

export function cancellationSummary(sales) {
  const cancelled = sales.filter((sale) => sale.dealStatus === "cancelada");
  const closed = cancelled.length + sales.filter(isActiveSale).length;
  const byVendor = totalsByVendor(cancelled).map((item) => {
    const count = cancelled.filter((sale) => (sale.vendorId?._id ?? NO_NAME) === item.key).length;
    return {
      ...item,
      detail: `${count} ${count === 1 ? "cancelada" : "canceladas"}`,
    };
  });

  return {
    count: cancelled.length,
    closed,
    rate: closed ? cancelled.length / closed : 0,
    lostValue: sumValues(cancelled),
    byVendor,
  };
}

export function salesHeatmap(sales) {
  const cells = WEEKDAYS.map(() => Array.from({ length: 24 }, () => ({ count: 0, value: 0 })));

  sales.forEach((sale) => {
    const { weekday, hour } = getWeekdayAndHour(sale.realizedAt);
    const cell = cells[weekday][hour];
    cells[weekday][hour] = {
      count: cell.count + 1,
      value: cell.value + (sale.value ?? 0),
    };
  });

  const max = Math.max(...cells.flat().map((cell) => cell.count));

  return { cells, max };
}

export function shareOf(items) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return items.map((item) => ({
    ...item,
    share: total ? item.value / total : 0,
  }));
}

export function segmentShare(sales) {
  const totals = new Map();

  sales.forEach((sale) => {
    const segment = segmentOf(sale);
    totals.set(segment, (totals.get(segment) ?? 0) + (sale.value ?? 0));
  });

  return shareOf(
    [...totals].map(([key, value]) => ({ key, label: key, value })).sort((a, b) => a.label.localeCompare(b.label)),
  );
}

export function concentration(sales, size = TOP_VENDORS) {
  const vendors = shareOf(totalsByVendor(sales));
  const top = vendors.slice(0, size);
  const rest = vendors.slice(size);

  return {
    top,
    topShare: top.reduce((sum, item) => sum + item.share, 0),
    rest: {
      count: rest.length,
      value: rest.reduce((sum, item) => sum + item.value, 0),
      share: rest.reduce((sum, item) => sum + item.share, 0),
    },
  };
}

export function weeklyTotals(activeSales, now = new Date()) {
  const currentWeek = getWeekKey(now);
  const firstWeek = activeSales.map((sale) => getWeekKey(sale.realizedAt)).sort()[0];

  if (!firstWeek) {
    return { weeks: [], sales: [], renewals: [] };
  }

  const weeks = [];
  for (let week = firstWeek; week <= currentWeek; week = addDays(week, 7)) {
    weeks.push(week);
  }

  const totals = { sales: weeks.map(() => 0), renewals: weeks.map(() => 0) };
  activeSales.forEach((sale) => {
    const index = weeks.indexOf(getWeekKey(sale.realizedAt));
    if (index >= 0) {
      totals[funnelOf(sale)][index] += sale.value ?? 0;
    }
  });

  return { weeks, ...totals };
}

export function forecast({ days, total }, goal, endDay, now = new Date()) {
  const today = getDayKey(now);
  const sold = total.at(-1) ?? 0;
  const ended = today > endDay;
  const elapsedDays = days.length ? daysBetween(days[0], ended ? endDay : today) + 1 : 0;
  const dailyAverage = elapsedDays ? sold / elapsedDays : 0;
  const daysLeft = ended ? 0 : daysBetween(today, endDay);
  const remaining = Math.max(goal - sold, 0);
  const projection = sold + dailyAverage * daysLeft;

  return {
    sold,
    goal,
    remaining,
    ended,
    reached: sold >= goal,
    daysLeft,
    dailyAverage,
    projection,
    willHit: projection >= goal,
    requiredPerDay: remaining > 0 ? remaining / Math.max(daysLeft, 1) : 0,
  };
}

export function goalTrack(campaign, goal, endDay, now = new Date()) {
  const plan = forecast(campaign, goal, endDay, now);
  const actual = campaign.total;
  const todayIndex = actual.length - 1;

  if (todayIndex < 0 || plan.daysLeft === 0) {
    return { days: campaign.days, actual, projection: null, required: null };
  }

  const futureDays = Array.from({ length: plan.daysLeft }, (_, index) => addDays(campaign.days[todayIndex], index + 1));
  const ahead = (perDay) => [
    ...actual.slice(0, -1).map(() => null),
    plan.sold,
    ...futureDays.map((_, index) => plan.sold + perDay * (index + 1)),
  ];

  return {
    days: [...campaign.days, ...futureDays],
    actual: [...actual, ...futureDays.map(() => null)],
    projection: ahead(plan.dailyAverage),
    required: plan.reached ? null : ahead(plan.requiredPerDay),
  };
}

export function buildSalesInsights(sales, weekKey, now = new Date()) {
  const campaignSales = sales.filter(isActiveSale);
  const activeSales = filterSalesByWeek(campaignSales, weekKey);
  const periodSales = filterSalesByWeek(sales, weekKey);

  return {
    activeSales,
    kpis: buildKpis(campaignSales, weekKey),
    ticket: {
      bySegment: ticketBySegment(activeSales),
      byVendor: ticketByVendor(activeSales),
    },
    cancellations: cancellationSummary(periodSales),
    heatmap: salesHeatmap(activeSales),
    segments: segmentShare(activeSales),
    concentration: concentration(activeSales),
    weekly: weeklyTotals(campaignSales, now),
  };
}
