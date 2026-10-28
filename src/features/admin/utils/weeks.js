const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const toSaoPauloClock = (date) => new Date(new Date(date).getTime() - SAO_PAULO_OFFSET_MS);

const mondayOf = (weekKey) => new Date(`${weekKey}T00:00:00.000Z`);

export function getWeekKey(date) {
  const clock = toSaoPauloClock(date);
  const daysSinceMonday = (clock.getUTCDay() + 6) % 7;
  const monday = Date.UTC(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate() - daysSinceMonday);

  return new Date(monday).toISOString().slice(0, 10);
}

export function previousWeekKey(weekKey) {
  return new Date(mondayOf(weekKey).getTime() - WEEK_MS).toISOString().slice(0, 10);
}

export function getWeekRange(weekKey) {
  const start = new Date(mondayOf(weekKey).getTime() + SAO_PAULO_OFFSET_MS);

  return { start, end: new Date(start.getTime() + WEEK_MS) };
}

const formatDayMonth = (weekKey, daysAfterMonday) => {
  const day = new Date(mondayOf(weekKey).getTime() + daysAfterMonday * DAY_MS);

  return `${String(day.getUTCDate()).padStart(2, "0")}/${String(day.getUTCMonth() + 1).padStart(2, "0")}`;
};

export function formatWeekLabel(weekKey, now = new Date()) {
  const period = `${formatDayMonth(weekKey, 0)} a ${formatDayMonth(weekKey, 6)}`;
  const currentWeek = getWeekKey(now);

  if (weekKey === currentWeek) {
    return `Semana atual (${period})`;
  }

  if (weekKey === previousWeekKey(currentWeek)) {
    return `Semana passada (${period})`;
  }

  return period;
}

export function getFirstWeekOfMonth(now = new Date()) {
  const clock = toSaoPauloClock(now);
  const firstDayOfMonth = Date.UTC(clock.getUTCFullYear(), clock.getUTCMonth(), 1) + SAO_PAULO_OFFSET_MS;

  return getWeekKey(firstDayOfMonth);
}

export function listWeeks(sales, now = new Date()) {
  const currentWeek = getWeekKey(now);
  const firstWeek = sales
    .filter((sale) => sale.realizedAt)
    .map((sale) => getWeekKey(sale.realizedAt))
    .reduce((earliest, week) => (week < earliest ? week : earliest), getFirstWeekOfMonth(now));

  const weeks = [];
  for (let week = currentWeek; week >= firstWeek; week = previousWeekKey(week)) {
    weeks.push({ key: week, label: formatWeekLabel(week, now) });
  }

  return weeks;
}

export function filterSalesByWeek(sales, weekKey) {
  if (!weekKey) {
    return sales;
  }

  const { start, end } = getWeekRange(weekKey);

  return sales.filter((sale) => {
    const realizedAt = new Date(sale.realizedAt);
    return realizedAt >= start && realizedAt < end;
  });
}
