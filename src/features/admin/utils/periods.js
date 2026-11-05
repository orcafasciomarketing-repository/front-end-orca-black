import { addDays, daysBetween, formatWeekLabel, getDayKey } from "./weeks";

export const CUSTOM_PERIOD = "custom";

export const ALL_PERIODS = { value: "", from: "", to: "" };

export const PERIOD_PRESETS = [
  { value: "last-3", label: "Últimos 3 dias", days: 3 },
  { value: "last-7", label: "Últimos 7 dias", days: 7 },
  { value: "last-15", label: "Últimos 15 dias", days: 15 },
  { value: "last-30", label: "Últimos 30 dias", days: 30 },
  { value: "month", label: "Este mês" },
];

const formatDay = (dayKey) => `${dayKey.slice(8, 10)}/${dayKey.slice(5, 7)}`;

const isWeekKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export function resolvePeriod({ value, from, to }, now = new Date()) {
  const today = getDayKey(now);

  if (!value) {
    return null;
  }

  if (value === "month") {
    return { type: "preset", key: value, start: `${today.slice(0, 8)}01`, end: today, label: "Este mês" };
  }

  const preset = PERIOD_PRESETS.find((option) => option.value === value);
  if (preset) {
    return { type: "preset", key: value, start: addDays(today, 1 - preset.days), end: today, label: preset.label };
  }

  if (value === CUSTOM_PERIOD) {
    if (!from) {
      return null;
    }

    const [start, end] = [from, to || today].sort();
    return { type: "custom", key: `${start}-a-${end}`, start, end, label: `${formatDay(start)} a ${formatDay(end)}` };
  }

  if (isWeekKey(value)) {
    return { type: "week", key: value, start: value, end: addDays(value, 6), label: formatWeekLabel(value, now) };
  }

  return null;
}

export function filterSalesByPeriod(sales, period) {
  if (!period) {
    return sales;
  }

  return sales.filter((sale) => {
    if (!sale.realizedAt) {
      return false;
    }

    const day = getDayKey(sale.realizedAt);
    return day >= period.start && day <= period.end;
  });
}

export function previousPeriod(period) {
  const length = daysBetween(period.start, period.end) + 1;

  return { ...period, start: addDays(period.start, -length), end: addDays(period.start, -1) };
}

export const comparisonLabel = (period) => (period.type === "week" ? "semana anterior" : "período anterior");

export const periodFileSuffix = (period) => {
  if (!period) {
    return "";
  }

  return period.type === "week" ? `-semana-${period.key}` : `-${period.start}-a-${period.end}`;
};
