import { funnelOf, isActiveSale, listDays, segmentOf, totalsByVendor } from "./chartData";
import { filterSalesByPeriod, previousPeriod } from "./periods";
import { addDays, daysBetween, getDayKey, getWeekKey } from "./weeks";

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

export function buildKpis(activeSales, period) {
  const current = summarize(filterSalesByPeriod(activeSales, period));

  if (!period) {
    return { current, previous: null };
  }

  return { current, previous: summarize(filterSalesByPeriod(activeSales, previousPeriod(period))) };
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

const EMPTY_DAY = { count: 0, value: 0 };

const sumCells = (cells) =>
  cells.reduce((total, cell) => ({ count: total.count + cell.count, value: total.value + cell.value }), EMPTY_DAY);

export function salesCalendar(sales, days) {
  if (days.length === 0) {
    return { weeks: [], weekdayTotals: WEEKDAYS.map(() => EMPTY_DAY), max: 0 };
  }

  const byDay = new Map();
  sales.forEach((sale) => {
    const day = getDayKey(sale.realizedAt);
    const current = byDay.get(day) ?? EMPTY_DAY;
    byDay.set(day, { count: current.count + 1, value: current.value + (sale.value ?? 0) });
  });

  const first = days[0];
  const last = days.at(-1);
  const weeks = [];

  for (let week = getWeekKey(`${first}T15:00:00.000Z`); week <= last; week = addDays(week, 7)) {
    const cells = WEEKDAYS.map((_, index) => {
      const day = addDays(week, index);
      const inRange = day >= first && day <= last;
      return { day, inRange, ...(inRange ? (byDay.get(day) ?? EMPTY_DAY) : EMPTY_DAY) };
    });
    weeks.push({ week, cells, total: sumCells(cells) });
  }

  return {
    weeks,
    weekdayTotals: WEEKDAYS.map((_, index) => sumCells(weeks.map((week) => week.cells[index]))),
    max: Math.max(...weeks.flatMap((week) => week.cells.map((cell) => cell.count))),
  };
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
      items: rest,
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

export function buildSalesInsights(sales, period, now = new Date()) {
  const campaignSales = sales.filter(isActiveSale);
  const activeSales = filterSalesByPeriod(campaignSales, period);
  const periodSales = filterSalesByPeriod(sales, period);

  return {
    activeSales,
    campaignTotal: sumValues(campaignSales),
    kpis: buildKpis(campaignSales, period),
    ticket: {
      bySegment: ticketBySegment(activeSales),
      byVendor: ticketByVendor(activeSales),
    },
    cancellations: cancellationSummary(periodSales),
    calendar: salesCalendar(activeSales, listDays(activeSales, period, now)),
    segments: segmentShare(activeSales),
    concentration: concentration(activeSales),
    weekly: weeklyTotals(campaignSales, now),
  };
}
