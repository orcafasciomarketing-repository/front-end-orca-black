import { funnelOf, isActiveSale, segmentOf, totalsByVendor } from "./chartData";
import { filterSalesByPeriod, previousPeriod } from "./periods";
import { monthDays, monthOf, monthsBetween } from "./dateRange";
import { addDays, getDayKey, getWeekKey } from "./weeks";

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

export function salesCalendar(sales, { start, end }, today) {
  const byDay = new Map();
  sales.forEach((sale) => {
    const day = getDayKey(sale.realizedAt);
    const current = byDay.get(day) ?? EMPTY_DAY;
    byDay.set(day, { count: current.count + 1, value: current.value + (sale.value ?? 0) });
  });

  const months = monthsBetween(start, end).map((month) => {
    const days = monthDays(month);
    const weeks = [];

    for (let week = getWeekKey(`${days[0]}T15:00:00.000Z`); week <= days.at(-1); week = addDays(week, 7)) {
      const cells = WEEKDAYS.map((_, index) => {
        const day = addDays(week, index);
        const inMonth = monthOf(day) === month;
        const inPeriod = inMonth && day >= start && day <= end && day <= today;
        return {
          day,
          inMonth,
          inPeriod,
          future: inMonth && day > today,
          ...(inPeriod ? (byDay.get(day) ?? EMPTY_DAY) : EMPTY_DAY),
        };
      });
      weeks.push({ week, cells, total: sumCells(cells) });
    }

    return {
      month,
      weeks,
      total: sumCells(weeks.map((week) => week.total)),
      weekdayTotals: WEEKDAYS.map((_, index) => sumCells(weeks.map((week) => week.cells[index]))),
    };
  });

  return {
    months,
    max: Math.max(0, ...months.flatMap((month) => month.weeks.flatMap((week) => week.cells.map((cell) => cell.count)))),
  };
}

export function calendarRange(activeSales, period, today) {
  if (period) {
    return { start: period.start, end: period.end };
  }

  const firstDay = activeSales.map((sale) => getDayKey(sale.realizedAt)).sort()[0];

  return { start: firstDay && firstDay < today ? firstDay : today, end: today };
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

export function forecastTrack(campaign, forecast) {
  const { today, goal } = forecast;
  const end = forecast.campaign.end;
  const days = [...campaign.days];
  for (let day = days.at(-1) ?? today; day < end; ) {
    day = addDays(day, 1);
    days.push(day);
  }

  const actual = days.map((_, index) => (index < campaign.total.length ? campaign.total[index] : null));
  const todayIndex = campaign.days.indexOf(today);

  if (todayIndex < 0 || today >= end) {
    return { days, actual, realistic: null, required: null };
  }

  const sold = campaign.total[todayIndex];
  const productiveAhead = forecast.trajectory.days.filter((day) => day > today);
  const realisticByDay = new Map(forecast.trajectory.days.map((day, index) => [day, forecast.trajectory.realistic[index]]));

  let lastRealistic = sold;
  const realistic = days.map((day) => {
    if (day < today) return null;
    if (day === today) return sold;
    lastRealistic = realisticByDay.get(day) ?? lastRealistic;
    return lastRealistic;
  });

  const required =
    productiveAhead.length > 0 && sold < goal
      ? days.map((day) => {
          if (day < today) return null;
          const done = productiveAhead.filter((productiveDay) => productiveDay <= day).length;
          return sold + ((goal - sold) * done) / productiveAhead.length;
        })
      : null;

  return { days, actual, realistic, required };
}

export const TREND_DAYS = 7;

export function lastDaysTrend(activeSales, today, length = TREND_DAYS) {
  const days = Array.from({ length }, (_, index) => addDays(today, index - length + 1));
  const byDay = new Map(days.map((day) => [day, { total: 0, count: 0 }]));

  activeSales.forEach((sale) => {
    const day = byDay.get(getDayKey(sale.realizedAt));
    if (day) {
      day.total += sale.value ?? 0;
      day.count += 1;
    }
  });

  const values = days.map((day) => byDay.get(day));

  return {
    days,
    total: values.map((value) => value.total),
    count: values.map((value) => value.count),
    average: values.map((value) => (value.count ? value.total / value.count : 0)),
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
    trend: lastDaysTrend(campaignSales, getDayKey(now)),
    ticket: {
      bySegment: ticketBySegment(activeSales),
      byVendor: ticketByVendor(activeSales),
    },
    cancellations: cancellationSummary(periodSales),
    calendar: salesCalendar(activeSales, calendarRange(activeSales, period, getDayKey(now)), getDayKey(now)),
    segments: segmentShare(activeSales),
    concentration: concentration(activeSales),
    weekly: weeklyTotals(campaignSales, now),
  };
}
