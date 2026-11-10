import { dayKeyOf as goalDayKeyOf, monthWeeks } from "../../features/goals/utils/goalMath";
import { buildForecast } from "./mockForecast";
import { getMonthTiers } from "./mockGoals";

export const POINTS = { sales: 2, farm: 1, passage: 1 };
export const BLACK_FRIDAY_GOAL = 3000000;
// Metas de setor (somam a meta total), como no backend
export const SEGMENT_GOALS = { b2b: 2000000, b2g: 1000000 };

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

  const segments = {};
  for (const [segment, goal] of Object.entries(SEGMENT_GOALS)) {
    const segmentTotal = db.sales
      .filter((sale) => isActive(sale) && sale.segment === segment)
      .reduce((sum, sale) => sum + sale.value, 0);
    segments[segment] = {
      goal,
      total: segmentTotal,
      percent: Math.round((segmentTotal / goal) * 10000) / 100,
    };
  }

  return { goal: BLACK_FRIDAY_GOAL, total, percent, segments };
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

const inSegment = (sale, segment) => !segment || sale.segment === segment;

export function getVendorRanking(db, period, funnelType, now = new Date(), segment = null) {
  const pointsByVendor = new Map();

  for (const sale of findActiveByPeriod(db, period, now)) {
    if (sale.funnelType !== funnelType || !inSegment(sale, segment)) continue;
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

export function getSdrRanking(db, period, now = new Date(), segment = null) {
  const pointsBySdr = new Map();

  for (const sale of findActiveByPeriod(db, period, now)) {
    if (!inSegment(sale, segment)) continue;
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

// Igual ao GET /analytics/forecast: segment "b2b"/"b2g" usa as vendas e a meta do setor
export function getForecast(db, segment, now = new Date(), month = null) {
  const validSegment = ["b2b", "b2g"].includes(segment) ? segment : null;
  const sales = db.sales.filter((sale) => isActive(sale) && (!validSegment || sale.segment === validSegment));
  if (month) return getMonthForecast(db, validSegment, sales, now, month);
  const segmentGoal = validSegment ? SEGMENT_GOALS[validSegment] : 0;
  const goal = segmentGoal > 0 ? segmentGoal : BLACK_FRIDAY_GOAL;

  return {
    segment: validSegment,
    goalIsTotal: !(segmentGoal > 0),
    period: { type: "campaign" },
    ...buildForecast({ sales, goal, now }),
  };
}

function getMonthForecast(db, segment, sales, now, month) {
  const weeks = monthWeeks(month);
  const start = weeks[0].start;
  const end = weeks[weeks.length - 1].end;
  const monthSales = sales.filter((sale) => {
    const day = goalDayKeyOf(sale.realizedAt);
    return day >= start && day <= end;
  });
  const tiers = getMonthTiers(db, month, segment, now);
  const goal = tiers?.goal ?? 0;

  return {
    segment,
    goalIsTotal: false,
    period: { type: "month", month, start, end },
    monthTiers: tiers,
    ...buildForecast({ sales: monthSales, goal, now, start, end }),
  };
}

const mockDayKey = (date) => new Date(new Date(date).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

const mockNextDay = (day) => new Date(new Date(`${day}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function getPointsHistory(db, segment, now = new Date()) {
  const validSegment = ["b2b", "b2g"].includes(segment) ? segment : null;
  const today = mockDayKey(now);
  const sales = db.sales.filter((sale) => isActive(sale) && inSegment(sale, validSegment));
  const firstDay = sales
    .map((sale) => mockDayKey(sale.realizedAt))
    .filter((day) => day <= today)
    .sort()[0];

  const days = [];
  for (let day = firstDay; firstDay && day <= today; day = mockNextDay(day)) {
    days.push(day);
  }
  const zeros = () => days.map(() => 0);
  const teams = new Map(
    db.teams.map((team) => [
      team._id,
      { teamId: team._id, teamName: team.name, teamShirt: team.imageUrl, sales: zeros(), farm: zeros(), passage: zeros() },
    ]),
  );
  const vendorTeam = new Map(db.vendors.map((vendor) => [vendor._id, vendor.teamId]));
  const sdrTeam = new Map(db.sdrs.map((sdr) => [sdr._id, sdr.teamId]));

  for (const sale of sales) {
    const index = days.indexOf(mockDayKey(sale.realizedAt));
    if (index < 0) continue;
    const sellerTeam = teams.get(vendorTeam.get(sale.vendorId));
    if (sellerTeam) sellerTeam[sale.funnelType][index] += POINTS[sale.funnelType];
    for (const sdrId of sale.sdrIds) {
      const team = teams.get(sdrTeam.get(sdrId));
      if (team) team.passage[index] += POINTS.passage;
    }
  }

  const history = [...teams.values()].map((team) => ({
    ...team,
    total: days.map((_, index) => team.sales[index] + team.farm[index] + team.passage[index]),
  }));

  return {
    segment: validSegment,
    days,
    teams: history,
    total: days.map((_, index) => history.reduce((sum, team) => sum + team.total[index], 0)),
  };
}

export function getPeoplePoints(db, { period = "all", segment = null, from = null, to = null } = {}, now = new Date()) {
  const validSegment = ["b2b", "b2g"].includes(segment) ? segment : null;
  const sales = findActiveByPeriod(db, period, now).filter((sale) => {
    const day = mockDayKey(sale.realizedAt);
    return inSegment(sale, validSegment) && (!from || day >= from) && (!to || day <= to);
  });

  const emptyPoints = () => ({ sales: 0, farm: 0, passage: 0 });
  const vendorPoints = new Map(db.vendors.map((vendor) => [vendor._id, emptyPoints()]));
  const sdrPoints = new Map(db.sdrs.map((sdr) => [sdr._id, emptyPoints()]));

  for (const sale of sales) {
    const vendor = vendorPoints.get(sale.vendorId);
    if (vendor) vendor[sale.funnelType] += POINTS[sale.funnelType];
    for (const sdrId of sale.sdrIds) {
      const sdr = sdrPoints.get(sdrId);
      if (sdr) sdr.passage += POINTS.passage;
    }
  }

  const toPerson = (kind, person, name, points) => ({
    personId: person._id,
    kind,
    name,
    job: person.job,
    imageUrl: person.imageUrl,
    teamId: person.teamId ?? null,
    ...points,
    total: points.sales + points.farm + points.passage,
  });

  return {
    segment: validSegment,
    period,
    from,
    to,
    teams: db.teams
      .map((team) => ({ teamId: team._id, teamName: team.name, teamShirt: team.imageUrl }))
      .sort((a, b) => a.teamName.localeCompare(b.teamName, "pt-BR")),
    people: [
      ...db.vendors.map((vendor) => toPerson("vendor", vendor, vendor.vendorName, vendorPoints.get(vendor._id))),
      ...db.sdrs.map((sdr) => toPerson("sdr", sdr, sdr.name, sdrPoints.get(sdr._id))),
    ].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR")),
  };
}

export const MOCK_PERSON = { kind: "vendor", id: "vendor-brenda" };

function findMockPerson(db, person = MOCK_PERSON) {
  const record =
    person.kind === "vendor"
      ? db.vendors.find((vendor) => vendor._id === person.id)
      : db.sdrs.find((sdr) => sdr._id === person.id);
  const team = db.teams.find((item) => item._id === record.teamId);

  return {
    kind: person.kind,
    id: record._id,
    name: person.kind === "vendor" ? record.vendorName : record.name,
    job: record.job,
    imageUrl: record.imageUrl,
    team: team ? { teamId: team._id, teamName: team.name, teamShirt: team.imageUrl } : null,
  };
}

export function getMe(db, person = MOCK_PERSON) {
  return findMockPerson(db, person);
}

export function getMySales(db, person = MOCK_PERSON) {
  const sales = db.sales
    .filter((sale) => (person.kind === "vendor" ? sale.vendorId === person.id : sale.sdrIds.includes(person.id)))
    .map((sale) => populateSale(db, sale));

  return { data: sales, total: sales.length };
}

export function getMyTeam(db, period = "all", now = new Date(), person = MOCK_PERSON) {
  const me = findMockPerson(db, person);
  const teamId = me.team?.teamId ?? null;
  const teams = getScoreboard(db, period, now).map((team, index) => ({
    position: index + 1,
    teamId: team.teamId,
    teamName: team.teamName,
    teamShirt: team.teamShirt,
    total: team.total,
  }));

  return {
    period,
    team: teams.find((team) => team.teamId === teamId) ?? null,
    teams,
    people: getPeoplePoints(db, { period }, now)
      .people.filter((member) => teamId && member.teamId === teamId)
      .map((member, index) => ({
        position: index + 1,
        personId: member.personId,
        kind: member.kind,
        name: member.name,
        job: member.job,
        imageUrl: member.imageUrl,
        sales: member.sales,
        farm: member.farm,
        passage: member.passage,
        total: member.total,
        isMe: member.kind === me.kind && member.personId === me.id,
      })),
  };
}


// Prêmios (cópia das regras do backend, features/prizes/service/prizeCalculator.js):
// a cada PRIZE_POINTS_STEP pontos acumulados (inclusive a semana em andamento), 1 prêmio; saldo = direitos − retirados
export const PRIZE_POINTS_STEP = 10;

const addDayKeys = (day, amount) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

// Setor pelo cargo ("B2B Sales", "B2G Farmer"); CS, Suporte e SDR sem setor no cargo ficam só para o admin
const prizeSegmentOf = (job) => String(job ?? "").trim().toLowerCase().match(/^(b2b|b2g)\b/)?.[1] ?? null;
const inPrizeSegment = (segment) => (person) => !segment || prizeSegmentOf(person.job) === segment;

// Retiradas de demonstração, na segunda da semana atual
function mockWithdrawals(now) {
  const monday = mockDayKey(getWeekRange(0, now).startOfWeek);
  return [
    { _id: "withdrawal-1", personId: "vendor-brenda", kind: "vendor", quantity: 1, withdrawnAt: monday, createdBy: "master@demo.com" },
  ];
}

export function getPrizes(db, segment = null, now = new Date()) {
  const validSegment = ["b2b", "b2g"].includes(segment) ? segment : null;
  const today = mockDayKey(now);
  const start = mockDayKey(getWeekRange(0, now).startOfWeek);

  const all = getPeoplePoints(db, {}, now);
  const current = getPeoplePoints(db, { from: start }, now);
  const keyOf = (kind, personId) => `${kind}-${personId}`;
  const currentByKey = new Map(current.people.map((person) => [keyOf(person.kind, person.personId), person.total]));
  const withdrawnByKey = new Map();
  for (const withdrawal of mockWithdrawals(now)) {
    const key = keyOf(withdrawal.kind, withdrawal.personId);
    withdrawnByKey.set(key, (withdrawnByKey.get(key) ?? 0) + withdrawal.quantity);
  }

  const people = all.people
    .map((person) => {
      const key = keyOf(person.kind, person.personId);
      const accumulated = person.total;
      const currentWeek = currentByKey.get(key) ?? 0;
      const withdrawn = withdrawnByKey.get(key) ?? 0;
      const earned = Math.floor(accumulated / PRIZE_POINTS_STEP);
      const nextPrizeAt = PRIZE_POINTS_STEP * (Math.max(earned, withdrawn) + 1);
      return {
        personId: person.personId,
        kind: person.kind,
        name: person.name,
        job: person.job,
        imageUrl: person.imageUrl,
        teamId: person.teamId,
        accumulated,
        currentWeek,
        earned,
        withdrawn,
        balance: earned - withdrawn,
        debtPoints: Math.max(withdrawn * PRIZE_POINTS_STEP - accumulated, 0),
        nextPrizeAt,
        pointsToNext: nextPrizeAt - accumulated,
      };
    })
    .filter(inPrizeSegment(validSegment))
    .sort((a, b) => b.balance - a.balance || b.accumulated - a.accumulated || a.name.localeCompare(b.name, "pt-BR"));

  return {
    segment: validSegment,
    step: PRIZE_POINTS_STEP,
    today,
    currentWeek: { start, end: addDayKeys(start, 6) },
    teams: all.teams,
    people,
  };
}

export function getMyPrizes(db, now = new Date(), person = MOCK_PERSON) {
  const summary = getPrizes(db, null, now);
  const mine = summary.people.find((item) => item.kind === person.kind && item.personId === person.id);

  return {
    step: summary.step,
    accumulated: mine?.accumulated ?? 0,
    currentWeek: mine?.currentWeek ?? 0,
    earned: mine?.earned ?? 0,
    withdrawn: mine?.withdrawn ?? 0,
    balance: mine?.balance ?? 0,
    pointsToNext: mine?.pointsToNext ?? summary.step,
  };
}

export function getPrizeWithdrawals(db, segment = null, now = new Date()) {
  const validSegment = ["b2b", "b2g"].includes(segment) ? segment : null;
  const people = new Map([
    ...db.vendors.map((vendor) => [`vendor-${vendor._id}`, { name: vendor.vendorName, job: vendor.job }]),
    ...db.sdrs.map((sdr) => [`sdr-${sdr._id}`, { name: sdr.name, job: sdr.job }]),
  ]);

  return mockWithdrawals(now)
    .map((withdrawal) => {
      const person = people.get(`${withdrawal.kind}-${withdrawal.personId}`);
      return { ...withdrawal, name: person?.name ?? "Pessoa removida", job: person?.job ?? null, createdAt: now.toISOString() };
    })
    .filter(inPrizeSegment(validSegment));
}
