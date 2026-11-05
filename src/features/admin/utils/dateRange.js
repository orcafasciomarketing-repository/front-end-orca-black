import { addDays, daysBetween } from "./weeks";

export const WEEKDAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const longDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const toUtcDate = (dayKey) => new Date(`${dayKey}T12:00:00.000Z`);

export const monthOf = (dayKey) => dayKey.slice(0, 7);

export function addMonths(monthKey, months) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));

  return date.toISOString().slice(0, 7);
}

export function daysInMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);

  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthDays(monthKey) {
  return Array.from(
    { length: daysInMonth(monthKey) },
    (_, index) => `${monthKey}-${String(index + 1).padStart(2, "0")}`,
  );
}

export function monthsBetween(startDay, endDay) {
  const months = [];
  for (let month = monthOf(startDay); month <= monthOf(endDay); month = addMonths(month, 1)) {
    months.push(month);
  }

  return months;
}

export const weekdayIndex = (dayKey) => (toUtcDate(dayKey).getUTCDay() + 6) % 7;

export const weekdayName = (dayKey) => WEEKDAY_NAMES[weekdayIndex(dayKey)];

export function monthLabel(monthKey) {
  const label = monthFormatter.format(toUtcDate(`${monthKey}-01`));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const longDayLabel = (dayKey) => longDayFormatter.format(toUtcDate(dayKey));

export const shortDay = (dayKey) => `${dayKey.slice(8, 10)}/${dayKey.slice(5, 7)}`;

export function formatRange({ start, end }) {
  if (start === end) {
    return `${weekdayName(start).toLowerCase()}, ${shortDay(start)}`;
  }

  return `${shortDay(start)} a ${shortDay(end)}`;
}

export const rangeLength = ({ start, end }) => daysBetween(start, end) + 1;

export const shiftRange = ({ start, end }, days) => ({ start: addDays(start, days), end: addDays(end, days) });
