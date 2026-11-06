import { cumulativeByDay, funnelOf, isActiveSale, listDays, totalsByVendor } from "./chartData";
import { addDays, getDayKey, getWeekKey, previousWeekKey } from "./weeks";

const RECENT_SALES = 5;

const sumValues = (sales) => sales.reduce((total, sale) => total + (sale.value ?? 0), 0);

const byNewest = (a, b) => new Date(b.realizedAt) - new Date(a.realizedAt);

export function salesStreak(activeSales, today) {
  const days = new Set(activeSales.map((sale) => getDayKey(sale.realizedAt)));
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (days.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }

  return streak;
}

export function buildVendorProfile(sales, vendorId, now = new Date()) {
  const today = getDayKey(now);
  const vendorSales = sales.filter((sale) => sale.vendorId?._id === vendorId);
  const vendor = vendorSales[0]?.vendorId ?? null;
  const active = vendorSales.filter(isActiveSale);
  const ranking = totalsByVendor(sales.filter(isActiveSale));
  const position = ranking.findIndex((item) => item.key === vendorId);
  const thisWeek = getWeekKey(now);
  const weekTotal = (weekKey) => sumValues(active.filter((sale) => getWeekKey(sale.realizedAt) === weekKey));
  const days = listDays(active, null, now);
  const total = sumValues(active);

  return {
    vendor,
    total,
    count: active.length,
    average: active.length ? total / active.length : 0,
    newSales: sumValues(active.filter((sale) => funnelOf(sale) === "sales")),
    renewals: sumValues(active.filter((sale) => funnelOf(sale) === "renewals")),
    cancelled: vendorSales.filter((sale) => sale.dealStatus === "cancelada").length,
    position: position >= 0 ? position + 1 : null,
    vendorsCount: ranking.length,
    thisWeek: weekTotal(thisWeek),
    lastWeek: weekTotal(previousWeekKey(thisWeek)),
    streak: salesStreak(active, today),
    evolution: { days, values: cumulativeByDay(active, days) },
    recentSales: [...vendorSales].sort(byNewest).slice(0, RECENT_SALES),
  };
}
