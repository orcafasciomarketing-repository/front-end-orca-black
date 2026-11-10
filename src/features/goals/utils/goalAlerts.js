const LOW_CHANCE = 30;
const NEAR_SHARE = 0.1;
const NO_SALES_DAYS = 5;
const MAX_ITEMS = 6;

const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000);

function lastSaleDay(person, days, today) {
  let last = null;
  person.cumulative.forEach((value, index) => {
    if (days[index] > today) return;
    const previous = index > 0 ? person.cumulative[index - 1] : 0;
    if (value > previous) last = days[index];
  });
  return last;
}

export function buildGoalAlerts(people, progress) {
  const { days, today } = progress;
  if (!days.length || today < days[0] || today > days[days.length - 1]) return null;

  const elapsed = daysBetween(days[0], today) + 1;
  const open = people.filter((person) => !person.month.reached.includes("goal"));

  const lowChance = open
    .map((person) => ({ person, chance: person.forecast?.tiers?.goal?.probability ?? null }))
    .filter((item) => item.chance !== null && item.chance < LOW_CHANCE)
    .sort((a, b) => a.chance - b.chance);

  const noSales =
    elapsed < NO_SALES_DAYS
      ? []
      : people
          .filter((person) => person.month.reached.length < person.month.available.length)
          .map((person) => {
            const last = lastSaleDay(person, days, today);
            return { person, days: last === null ? null : daysBetween(last, today) };
          })
          .filter((item) => item.days === null || item.days >= NO_SALES_DAYS)
          .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));

  const nearTier = people
    .filter((person) => !person.month.reached.includes(person.month.current) && person.month.target > 0)
    .map((person) => ({ person, tier: person.month.current, remaining: person.month.remaining }))
    .filter((item) => item.remaining > 0 && item.remaining <= item.person.month.target * NEAR_SHARE)
    .sort((a, b) => a.remaining - b.remaining);

  return {
    lowChance: lowChance.slice(0, MAX_ITEMS),
    noSales: noSales.slice(0, MAX_ITEMS),
    nearTier: nearTier.slice(0, MAX_ITEMS),
  };
}
