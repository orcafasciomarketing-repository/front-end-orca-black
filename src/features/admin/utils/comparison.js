import { funnelOf, isActiveSale, segmentOf } from "./chartData";
import { addMonths, daysInMonth, monthOf, rangeLength, shiftRange } from "./dateRange";
import { getPassagePeople } from "./passages";
import { filterSalesByPeriod } from "./periods";
import { addDays, getDayKey, getWeekKey } from "./weeks";

export function comparisonPresets(today) {
  const monday = getWeekKey(`${today}T15:00:00.000Z`);
  const firstOfMonth = `${monthOf(today)}-01`;
  const previousMonth = addMonths(monthOf(today), -1);
  const sameDayLastMonth = Math.min(Number(today.slice(8, 10)), daysInMonth(previousMonth));

  return [
    {
      key: "day",
      label: "Hoje x mesmo dia da semana passada",
      a: { start: today, end: today },
      b: shiftRange({ start: today, end: today }, -7),
    },
    {
      key: "week",
      label: "Esta semana x semana passada",
      a: { start: monday, end: today },
      b: shiftRange({ start: monday, end: today }, -7),
    },
    {
      key: "last-7",
      label: "Últimos 7 dias x 7 dias antes",
      a: { start: addDays(today, -6), end: today },
      b: { start: addDays(today, -13), end: addDays(today, -7) },
    },
    {
      key: "month",
      label: "Este mês x mês passado",
      a: { start: firstOfMonth, end: today },
      b: { start: `${previousMonth}-01`, end: `${previousMonth}-${String(sameDayLastMonth).padStart(2, "0")}` },
    },
  ];
}

const sumValues = (sales) => sales.reduce((total, sale) => total + (sale.value ?? 0), 0);

export function summarizeRange(activeSales, range) {
  const sales = filterSalesByPeriod(activeSales, range);
  const total = sumValues(sales);

  return {
    total,
    count: sales.length,
    average: sales.length ? total / sales.length : 0,
    newSales: sumValues(sales.filter((sale) => funnelOf(sale) === "sales")),
    renewals: sumValues(sales.filter((sale) => funnelOf(sale) === "renewals")),
    b2b: sumValues(sales.filter((sale) => segmentOf(sale) === "B2B")),
    b2g: sumValues(sales.filter((sale) => segmentOf(sale) === "B2G")),
    passages: sales.flatMap(getPassagePeople).length,
  };
}

export function cumulativeByDayIndex(activeSales, range, length, today) {
  const totals = Array.from({ length }, () => 0);

  filterSalesByPeriod(activeSales, range).forEach((sale) => {
    const index = rangeLength({ start: range.start, end: getDayKey(sale.realizedAt) }) - 1;
    totals[index] += sale.value ?? 0;
  });

  let running = 0;
  return totals.map((value, index) => {
    const day = addDays(range.start, index);
    if (day > range.end || day > today) {
      return null;
    }
    running += value;
    return running;
  });
}

export const COMPARISON_ROWS = [
  { key: "total", label: "Total vendido", money: true },
  { key: "count", label: "Vendas fechadas", money: false },
  { key: "average", label: "Ticket médio", money: true },
  { key: "newSales", label: "Vendas novas", money: true },
  { key: "renewals", label: "Renovações", money: true },
  { key: "b2b", label: "B2B", money: true },
  { key: "b2g", label: "B2G", money: true },
  { key: "passages", label: "Passagens", money: false },
];

export function buildComparison(sales, a, b, today) {
  const activeSales = sales.filter(isActiveSale);
  const length = Math.max(rangeLength(a), rangeLength(b));

  return {
    a: summarizeRange(activeSales, a),
    b: summarizeRange(activeSales, b),
    length,
    dailyA: cumulativeByDayIndex(activeSales, a, length, today),
    dailyB: cumulativeByDayIndex(activeSales, b, length, today),
  };
}
