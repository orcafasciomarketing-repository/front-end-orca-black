const DAY_MS = 24 * 60 * 60 * 1000;
const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;

export const TIERS = ["goal", "super", "black"];

export const TIER_LABELS = { goal: "Meta", super: "Super meta", black: "Meta black" };

export const TYPE_LABELS = { farm: "Renovação", sales: "Vendas" };

export const STATUS_LABELS = {
  done: "Meta batida",
  ahead: "No ritmo",
  behind: "Atrasado",
  upcoming: "Não começou",
};

export const DEFAULT_LEVELS = [
  { key: "junior", name: "Júnior", weight: 1 },
  { key: "pleno", name: "Pleno", weight: 1.5 },
  { key: "senior", name: "Sênior", weight: 2 },
];

export const DEFAULT_PERCENTS = { farmPercent: 50, superPercent: 120, blackPercent: 150 };

export const dayKeyOf = (date) => new Date(new Date(date).getTime() - SAO_PAULO_OFFSET_MS).toISOString().slice(0, 10);

export const addDays = (day, amount) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + amount * DAY_MS).toISOString().slice(0, 10);

const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / DAY_MS);

export const toCents = (value) => Math.round(Number(value || 0) * 100);
export const fromCents = (cents) => cents / 100;

export const currentMonthKey = (now = new Date()) => dayKeyOf(now).slice(0, 7);

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function formatMonth(month) {
  const [year, number] = month.split("-");
  return `${MONTH_NAMES[Number(number) - 1]} de ${year}`;
}

export function formatShortDay(day) {
  const [, month, date] = day.split("-");
  return `${date}/${month}`;
}

export function monthWeeks(month) {
  const first = `${month}-01`;
  const weekDay = new Date(`${first}T00:00:00Z`).getUTCDay();
  let start = addDays(first, (8 - (weekDay || 7)) % 7);
  const weeks = [];
  while (start.slice(0, 7) === month) {
    weeks.push({ index: weeks.length, start, end: addDays(start, 6) });
    start = addDays(start, 7);
  }
  return weeks;
}

export function monthDays(weeks) {
  if (!weeks.length) return [];
  const total = daysBetween(weeks[0].start, weeks[weeks.length - 1].end) + 1;
  return Array.from({ length: total }, (_, index) => addDays(weeks[0].start, index));
}

export function distributeByWeight(totalCents, items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (!items.length || totalWeight <= 0 || totalCents <= 0) return new Map(items.map((item) => [item.key, 0]));

  const shares = items.map((item) => {
    const exact = (totalCents * item.weight) / totalWeight;
    return { key: item.key, cents: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  let rest = totalCents - shares.reduce((sum, share) => sum + share.cents, 0);
  [...shares]
    .sort((a, b) => b.fraction - a.fraction)
    .forEach((share) => {
      if (rest > 0) {
        share.cents += 1;
        rest -= 1;
      }
    });
  return new Map(shares.map((share) => [share.key, share.cents]));
}

export function splitEqually(totalCents, parts) {
  if (parts <= 0) return [];
  const base = Math.floor(totalCents / parts);
  const rest = totalCents - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index < rest ? 1 : 0));
}

export function segmentParts({ goal, farmPercent }) {
  const totalCents = toCents(goal);
  const farmCents = Math.round((totalCents * Number(farmPercent || 0)) / 100);
  return { farm: fromCents(farmCents), sales: fromCents(totalCents - farmCents) };
}

export function tiersOf(goal, superPercent, blackPercent) {
  const cents = toCents(goal);
  return {
    goal: fromCents(cents),
    super: fromCents(Math.round((cents * superPercent) / 100)),
    black: fromCents(Math.round((cents * blackPercent) / 100)),
  };
}

export function sumTiers(list) {
  return list.reduce(
    (sum, tiers) => ({
      goal: fromCents(toCents(sum.goal) + toCents(tiers.goal)),
      super: fromCents(toCents(sum.super) + toCents(tiers.super)),
      black: fromCents(toCents(sum.black) + toCents(tiers.black)),
    }),
    { goal: 0, super: 0, black: 0 },
  );
}

const round1 = (value) => Math.round(value * 10) / 10;

export function tierProgress(realized, tiers) {
  const reached = TIERS.filter((tier) => tiers[tier] > 0 && realized >= tiers[tier]);
  const current = TIERS.find((tier) => !reached.includes(tier)) ?? "black";
  const target = tiers[current];

  return {
    realized: fromCents(toCents(realized)),
    tiers,
    reached,
    current,
    target,
    percent: target > 0 ? round1((realized / target) * 100) : 0,
    remaining: fromCents(Math.max(toCents(target) - toCents(realized), 0)),
    excess: fromCents(Math.max(toCents(realized) - toCents(tiers.black), 0)),
  };
}

export function paceOf({ realized, goal, start, end, today }) {
  const totalDays = daysBetween(start, end) + 1;
  const elapsedDays = today < start ? 0 : today > end ? totalDays : daysBetween(start, today) + 1;
  const remainingDays = totalDays - elapsedDays;
  const expected = fromCents(Math.round((toCents(goal) * elapsedDays) / totalDays));
  const missing = Math.max(toCents(goal) - toCents(realized), 0);

  let status = "behind";
  if (goal > 0 && realized >= goal) status = "done";
  else if (elapsedDays === 0) status = "upcoming";
  else if (realized >= expected) status = "ahead";

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    expected,
    status,
    neededPerDay: remainingDays > 0 ? fromCents(Math.ceil(missing / remainingDays)) : fromCents(missing),
    projection: elapsedDays > 0 ? fromCents(Math.round((toCents(realized) / elapsedDays) * totalDays)) : 0,
  };
}

export function idealLine(goal, days) {
  return days.map((_, index) => fromCents(Math.round((toCents(goal) * (index + 1)) / days.length)));
}

export function untilToday(values, days, today) {
  return values.map((value, index) => (days[index] <= today ? value : null));
}
