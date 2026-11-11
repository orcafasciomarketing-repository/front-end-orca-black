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

export const DEFAULT_LEVEL_NAMES = ["Júnior", "Pleno", "Sênior"];

export const DEFAULT_TICKET = 2000;

export const DEFAULT_CONVERSION = { farm: "", sales: 30 };

export const HOLIDAYS = ["2026-10-12", "2026-11-02", "2026-11-20", "2026-12-25"];

export const GOAL_TYPES = ["farm", "sales"];

export const dayKeyOf = (date) => new Date(new Date(date).getTime() - SAO_PAULO_OFFSET_MS).toISOString().slice(0, 10);

export const addDays = (day, amount) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + amount * DAY_MS).toISOString().slice(0, 10);

const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / DAY_MS);

export const isWorkday = (day) => {
  const weekDay = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekDay >= 1 && weekDay <= 5 && !HOLIDAYS.includes(day);
};

export function workdaysBetween(from, to) {
  let count = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (isWorkday(day)) count += 1;
  }
  return count;
}

export const toCents = (value) => Math.round(Number(value || 0) * 100);
export const fromCents = (cents) => cents / 100;

export function parseMoney(text) {
  const clean = String(text).replace(/R\$|\s| /g, "");
  if (!clean) return "";
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : "";
}

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

export function segmentParts({ farmGoal, salesGoal }) {
  return { farm: fromCents(toCents(farmGoal)), sales: fromCents(toCents(salesGoal)) };
}

export function typeTiers(config, withBlack = false) {
  const parts = segmentParts(config);
  const black = { farm: withBlack ? config.farmBlack : 0, sales: withBlack ? config.salesBlack : 0 };
  const superOf = (type) =>
    config[`${type}Super`] != null
      ? fromCents(toCents(config[`${type}Super`]))
      : fromCents(Math.round((toCents(parts[type]) * Number(config.superPercent || 0)) / 100));
  return Object.fromEntries(
    GOAL_TYPES.map((type) => [
      type,
      {
        goal: parts[type],
        super: superOf(type),
        black: fromCents(toCents(black[type])),
      },
    ]),
  );
}

export function withSectorBlack(config, sectorGoal) {
  if (config.blackTyped && config.farmBlack != null && config.salesBlack != null) return config;
  const sector = toCents(sectorGoal);
  const farm = Math.min(toCents(config.farmBlack), Math.max(sector, 0));
  return { ...config, farmBlack: fromCents(farm), salesBlack: fromCents(Math.max(sector - farm, 0)) };
}

export function segmentTiers(byType) {
  return sumTiers(GOAL_TYPES.map((type) => byType[type]));
}

export function shareLike(totalCents, keys, weightsCents) {
  const hasWeight = weightsCents.some((value) => value > 0);
  return distributeByWeight(
    totalCents,
    keys.map((key, index) => ({ key, weight: hasWeight ? weightsCents[index] : 1 })),
  );
}

export function peopleTiers(people, byType) {
  const result = new Map(
    people.map((person) => [person.vendorId, { goal: fromCents(toCents(person.goal)), super: 0, black: 0 }]),
  );
  for (const tier of ["super", "black"]) {
    for (const type of GOAL_TYPES) {
      const members = people.filter((person) => person.type === type);
      const field = `${tier}Goal`;
      const saved = members.length > 0 && members.every((person) => person[field] != null);
      const shares = shareLike(
        toCents(byType[type][tier]),
        members.map((person) => person.vendorId),
        members.map((person) =>
          toCents(saved ? person[field] : tier === "black" ? (person.superGoal ?? person.goal) : person.goal),
        ),
      );
      shares.forEach((cents, key) => {
        result.get(key)[tier] = fromCents(cents);
      });
    }
  }
  return result;
}

export function weekTiers(personTiers, weekGoals) {
  const keys = weekGoals.map((_, index) => index);
  const weights = weekGoals.map(toCents);
  const superShares = shareLike(toCents(personTiers.super), keys, weights);
  const blackShares = shareLike(toCents(personTiers.black), keys, weights);
  return weekGoals.map((value, index) => ({
    goal: fromCents(toCents(value)),
    super: fromCents(superShares.get(index)),
    black: fromCents(blackShares.get(index)),
  }));
}

export function dynamicWeekTiers({ personTiers, daily, days, weeks, today }) {
  if (!weeks.length) return [];
  const soldBefore = (day) => days.reduce((sum, item, index) => (item < day ? sum + daily[index] : sum), 0);
  const currentIndex = weeks.findIndex((week) => week.start <= today && today <= week.end);
  const anchor = currentIndex >= 0 ? currentIndex : today < weeks[0].start ? 0 : weeks.length - 1;

  return weeks.map((week, index) => {
    const base = week.start <= today ? index : anchor;
    const before = soldBefore(weeks[base].start);
    const left = weeks.length - base;
    return Object.fromEntries(
      TIERS.map((tier) => {
        const target = toCents(personTiers[tier] ?? 0);
        return [tier, target > 0 ? fromCents(Math.round(Math.max(target - before, 0) / left)) : 0];
      }),
    );
  });
}

export const goalPerWorkday = (week) =>
  fromCents(Math.round(toCents(week.tiers.goal) / Math.max(week.pace?.totalDays ?? 1, 1)));

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
  const available = TIERS.filter((tier) => tiers[tier] > 0);
  const last = available[available.length - 1] ?? "goal";
  const reached = available.filter((tier) => realized >= tiers[tier]);
  const current = available.find((tier) => !reached.includes(tier)) ?? last;
  const target = tiers[current];

  return {
    realized: fromCents(toCents(realized)),
    tiers,
    reached,
    current,
    target,
    percent: target > 0 ? round1((realized / target) * 100) : 0,
    remaining: fromCents(Math.max(toCents(target) - toCents(realized), 0)),
    available,
    excess: tiers[last] > 0 ? fromCents(Math.max(toCents(realized) - toCents(tiers[last]), 0)) : 0,
  };
}

export function paceOf({ realized, goal, start, end, today }) {
  const totalDays = Math.max(workdaysBetween(start, end), 1);
  const elapsedDays = today < start ? 0 : today > end ? totalDays : workdaysBetween(start, today);
  const remainingDays = totalDays - elapsedDays;
  const daysToGo = today > end ? 0 : workdaysBetween(today < start ? start : today, end);
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
    daysToGo,
    neededPerDay: daysToGo > 0 ? fromCents(Math.ceil(missing / daysToGo)) : fromCents(missing),
    projection: elapsedDays > 0 ? fromCents(Math.round((toCents(realized) / elapsedDays) * totalDays)) : 0,
  };
}

export function idealLine(goal, days) {
  return days.map((_, index) => fromCents(Math.round((toCents(goal) * (index + 1)) / days.length)));
}

export function untilToday(values, days, today) {
  return values.map((value, index) => (days[index] <= today ? value : null));
}
