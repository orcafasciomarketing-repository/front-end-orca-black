export const POINTS = { sales: 2, farm: 1, passage: 1 };
export const BLACK_FRIDAY_GOAL = 3000000;

const SAO_PAULO_OFFSET_MS = 3 * 60 * 60 * 1000;

export function getWeekRange(weeksAgo = 0, now = new Date()) {
  const today = new Date(now.getTime() - SAO_PAULO_OFFSET_MS);
  const day = today.getUTCDay() || 7;
  const start = today.getUTCDate() - (day - 1) - 7 * weeksAgo;

  const startOfWeek = new Date(today);
  startOfWeek.setUTCDate(start);
  startOfWeek.setUTCHours(0, 0, 0, 0);

  const finalOfWeek = new Date(today);
  finalOfWeek.setUTCDate(start + 6);
  finalOfWeek.setUTCHours(23, 59, 59, 999);

  return {
    startOfWeek: new Date(startOfWeek.getTime() + SAO_PAULO_OFFSET_MS),
    finalOfWeek: new Date(finalOfWeek.getTime() + SAO_PAULO_OFFSET_MS),
  };
}

const isActive = (sale) => sale.dealStatus === "ativa";

const isBetween = (sale, start, end) => {
  const realizedAt = new Date(sale.realizedAt);
  return realizedAt >= start && realizedAt <= end;
};

export function findActiveByPeriod(db, period, now = new Date()) {
  const active = db.sales.filter(isActive);

  if (period === "all") {
    return active;
  }

  const { startOfWeek, finalOfWeek } = getWeekRange(period === "lastWeek" ? 1 : 0, now);
  return active.filter((sale) => isBetween(sale, startOfWeek, finalOfWeek));
}

export function populateSale(db, sale) {
  return {
    ...sale,
    vendorId: db.vendors.find((vendor) => vendor._id === sale.vendorId) ?? null,
    sdrIds: sale.sdrIds.map((sdrId) => db.sdrs.find((sdr) => sdr._id === sdrId)).filter(Boolean),
  };
}

export function findAllSales(db) {
  const sales = [...db.sales]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((sale) => populateSale(db, sale));

  return { data: sales, total: db.sales.length };
}

export function findSalesByVendor(db, vendorId) {
  const sales = db.sales.filter((sale) => sale.vendorId === vendorId).map((sale) => populateSale(db, sale));

  return { data: sales, total: sales.length };
}

export function findActiveSalesOfCurrentWeek(db, now = new Date()) {
  const sales = findActiveByPeriod(db, "week", now).map((sale) => populateSale(db, sale));

  return { data: sales, total: sales.length };
}

export function getGoalProgress(db) {
  const total = db.sales.filter(isActive).reduce((sum, sale) => sum + sale.value, 0);
  const percent = BLACK_FRIDAY_GOAL > 0 ? Math.round((total / BLACK_FRIDAY_GOAL) * 10000) / 100 : 0;

  return { goal: BLACK_FRIDAY_GOAL, total, percent };
}

export function getScoreboard(db, period, now = new Date()) {
  const sales = findActiveByPeriod(db, period, now);
  const vendorTeam = new Map(db.vendors.map((vendor) => [vendor._id, vendor.teamId]));
  const sdrTeam = new Map(db.sdrs.map((sdr) => [sdr._id, sdr.teamId]));
  const teams = new Map(
    db.teams.map((team) => [
      team._id,
      { teamId: team._id, teamName: team.name, teamShirt: team.imageUrl, farm: 0, sales: 0, passage: 0 },
    ]),
  );

  for (const sale of sales) {
    const vendorTeamId = vendorTeam.get(sale.vendorId);
    if (teams.has(vendorTeamId)) {
      teams.get(vendorTeamId)[sale.funnelType] += POINTS[sale.funnelType];
    }

    for (const sdrId of sale.sdrIds) {
      const sdrTeamId = sdrTeam.get(sdrId);
      if (teams.has(sdrTeamId)) {
        teams.get(sdrTeamId).passage += POINTS.passage;
      }
    }
  }

  return [...teams.values()]
    .map((team) => ({ ...team, total: team.farm + team.sales + team.passage }))
    .sort((a, b) => b.total - a.total);
}

export function getVendorRanking(db, period, funnelType, now = new Date()) {
  const pointsByVendor = new Map();

  for (const sale of findActiveByPeriod(db, period, now)) {
    if (sale.funnelType !== funnelType) continue;
    pointsByVendor.set(sale.vendorId, (pointsByVendor.get(sale.vendorId) || 0) + POINTS[sale.funnelType]);
  }

  const ranked = db.vendors
    .filter((vendor) => pointsByVendor.has(vendor._id))
    .map((vendor) => ({
      vendorId: vendor._id,
      name: vendor.vendorName,
      job: vendor.job,
      teamId: vendor.teamId,
      points: pointsByVendor.get(vendor._id),
      imageUrl: vendor.imageUrl,
    }))
    .sort((a, b) => b.points - a.points);

  return { vendor: ranked.slice(0, 3) };
}

export function getSdrRanking(db, period, now = new Date()) {
  const pointsBySdr = new Map();

  for (const sale of findActiveByPeriod(db, period, now)) {
    for (const sdrId of sale.sdrIds) {
      pointsBySdr.set(sdrId, (pointsBySdr.get(sdrId) || 0) + POINTS.passage);
    }
  }

  return db.sdrs
    .filter((sdr) => pointsBySdr.has(sdr._id))
    .map((sdr) => ({
      sdrId: sdr._id,
      name: sdr.name,
      job: sdr.job,
      teamId: sdr.teamId,
      points: pointsBySdr.get(sdr._id),
      imageUrl: sdr.imageUrl,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
}
