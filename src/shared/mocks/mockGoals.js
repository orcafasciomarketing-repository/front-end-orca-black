import { buildDraft, computeDraft, levelsOfType, toPayload } from "../../features/goals/utils/goalDraft";
import {
  currentMonthKey,
  dayKeyOf,
  dynamicWeekTiers,
  isWorkday,
  fromCents,
  monthDays,
  monthWeeks,
  paceOf,
  peopleTiers,
  segmentParts,
  segmentTiers,
  typeTiers,
  sumTiers,
  withSectorBlack,
  tierProgress,
  toCents,
} from "../../features/goals/utils/goalMath";
import { normalCdf, PACE_WEIGHTS, SCENARIO_FACTORS } from "./mockForecast";

const SEGMENTS = ["b2b", "b2g"];

const SECTOR_BLACK = { b2b: 200000, b2g: 240000 };

const level = (goal, superGoal) => ({ goal, superGoal });

const DEMO_LEVELS = {
  b2b: {
    farm: { junior: level(8000, 10000), pleno: level(10000, 12500), senior: level(14000, 17000) },
    sales: { junior: level(12000, 15000), pleno: level(15000, 18500), senior: level(20000, 24000) },
  },
  b2g: {
    farm: { junior: level(9000, 11000), pleno: level(11000, 13500), senior: level(15000, 18000) },
    sales: { junior: level(18000, 21500), pleno: level(21000, 25000), senior: level(26000, 31000) },
  },
};

const DEMO_TICKETS = { b2b: { farm: 2000, sales: 3000 }, b2g: { farm: null, sales: null } };

const DEMO_CONVERSION = { b2b: { farm: null, sales: 30 }, b2g: { farm: null, sales: null } };

// No B2B a Meta black de Venda é a própria Super de Venda (R$ 100.000); só Farmer tem uma Black acima da Super
const DEMO_BLACK = { b2b: { farm: 80000, sales: 100000 }, b2g: { farm: 70000, sales: 170000 } };

const blackInfo = (month, now) => ({
  month: currentMonthKey(now),
  active: month === currentMonthKey(now),
  total: 440000,
  sectorGoals: SECTOR_BLACK,
});

const segmentOfJob = (job) =>
  String(job ?? "")
    .trim()
    .toLowerCase()
    .match(/^(b2b|b2g)\b/)?.[1] ?? null;

const typeOfJob = (job) => (/farm/i.test(String(job ?? "")) ? "farm" : "sales");

function segmentVendors(db, segment) {
  return db.vendors
    .filter((vendor) => segmentOfJob(vendor.job) === segment)
    .map((vendor) => ({
      vendorId: vendor._id,
      name: vendor.vendorName,
      job: vendor.job,
      imageUrl: vendor.imageUrl,
      teamId: vendor.teamId,
      teamName: db.teams.find((team) => team._id === vendor.teamId)?.name ?? null,
      type: typeOfJob(vendor.job),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function demoConfig(db, month, segment) {
  const vendors = segmentVendors(db, segment);
  const black = { active: true, sectorGoal: SECTOR_BLACK[segment] };
  const draft = buildDraft({ config: null, previous: null, vendors }, black);
  const levels = draft.levels.map((item) => ({ ...item, ...DEMO_LEVELS[segment][item.type][item.key] }));
  const withSettings = {
    ...draft,
    levels,
    tickets: DEMO_TICKETS[segment],
    conversion: DEMO_CONVERSION[segment],
    farmBlack: DEMO_BLACK[segment].farm,
    salesBlack: DEMO_BLACK[segment].sales,
    people: draft.people.map((person, index) => {
      const options = levelsOfType(levels, person.type);
      return { ...person, level: options[index % options.length].key };
    }),
  };
  const computed = computeDraft(withSettings, black);
  const payload = toPayload(withSettings, computed, black);

  return {
    month,
    model: "levels",
    ...payload,
    farmGoal: computed.byType.farm.goal,
    salesGoal: computed.byType.sales.goal,
    farmSuper: computed.byType.farm.super,
    salesSuper: computed.byType.sales.super,
    superPercent: null,
    farmBlack: computed.byType.farm.black,
    salesBlack: computed.byType.sales.black,
    blackTyped: true,
    people: payload.people.map((person) => ({
      ...person,
      type: vendors.find((vendor) => vendor.vendorId === person.vendorId).type,
      weeks: [],
    })),
    visibility: { open: true, hidden: [] },
    updatedBy: "master@demo.com",
    updatedAt: `${month}-01T12:00:00.000Z`,
  };
}

function demoConfigs(db, month, now) {
  if (month !== currentMonthKey(now)) return [];
  return SEGMENTS.map((segment) => ({ segment, ...demoConfig(db, month, segment) }));
}

export function getGoalMonth(db, month, now = new Date()) {
  const configs = demoConfigs(db, month, now);
  const segments = Object.fromEntries(
    SEGMENTS.map((segment) => {
      const { segment: _segment, ...config } = configs.find((item) => item.segment === segment) ?? {};
      return [segment, { config: config.month ? config : null, previous: null, vendors: segmentVendors(db, segment) }];
    }),
  );

  return { month, weeks: monthWeeks(month), black: blackInfo(month, now), segments };
}

const sumOf = (values) => values.reduce((total, value) => total + value, 0);
const averageOf = (values) => (values.length ? sumOf(values) / values.length : 0);
const roundMoney = (value) => Math.round(value) / 100;
const roundPercent = (ratio) => Math.round(ratio * 10000) / 100;

function stdDevOf(values) {
  if (values.length < 2) return null;
  const mean = averageOf(values);
  return Math.sqrt(sumOf(values.map((value) => (value - mean) ** 2)) / (values.length - 1));
}

function chanceOf({ realized, target, realistic, stdDev, daysLeft }) {
  if (realized >= target) return 100;
  if (daysLeft === 0) return 0;
  if (stdDev === null) return null;
  if (stdDev === 0) return realistic >= target ? 100 : 0;
  return roundPercent(1 - normalCdf((target - realistic) / (stdDev * Math.sqrt(daysLeft))));
}

function monthForecast({ days, dailyCents, tiers, today }) {
  const productive = days.filter(isWorkday);
  const elapsed = productive.filter((day) => day <= today);
  const remaining = productive.filter((day) => day > today);
  const perDay = new Map(elapsed.map((day) => [day, 0]));
  days.forEach((day, index) => {
    if (!elapsed.length || day > today) return;
    const target = elapsed.findLast((productiveDay) => productiveDay <= day) ?? elapsed[0];
    perDay.set(target, perDay.get(target) + dailyCents[index]);
  });
  const values = elapsed.map((day) => perDay.get(day));
  const realized = sumOf(dailyCents);
  const averages = {
    last7: averageOf(values.slice(-7)),
    last30: averageOf(values.slice(-30)),
    campaign: averageOf(values),
  };
  const pace = sumOf(Object.keys(PACE_WEIGHTS).map((key) => averages[key] * PACE_WEIGHTS[key]));
  const daysLeft = remaining.length;
  const scenarioCents = Object.fromEntries(
    Object.entries(SCENARIO_FACTORS).map(([name, factor]) => [name, realized + pace * factor * daysLeft]),
  );
  const stdDev = stdDevOf(values.slice(-30));

  const trajectoryFor = (factor) => {
    let count = 0;
    return days.map((day) => {
      if (day < today) return null;
      if (day > today && isWorkday(day)) count += 1;
      return roundMoney(realized + pace * factor * count);
    });
  };

  return {
    productiveDays: { elapsed: elapsed.length, remaining: daysLeft },
    pace: {
      current: roundMoney(pace),
      last7: roundMoney(averages.last7),
      last30: roundMoney(averages.last30),
      month: roundMoney(averages.campaign),
    },
    scenarios: Object.fromEntries(Object.entries(scenarioCents).map(([name, cents]) => [name, roundMoney(cents)])),
    dailyStdDev: stdDev === null ? null : roundMoney(stdDev),
    tiers: Object.fromEntries(
      ["goal", "super", "black"]
        .filter((tier) => tiers[tier] > 0)
        .map((tier) => {
          const target = toCents(tiers[tier]);
          const requiredPace = daysLeft > 0 ? Math.max(target - realized, 0) / daysLeft : null;
          return [
            tier,
            {
              target: fromCents(target),
              requiredPace: requiredPace === null ? null : roundMoney(requiredPace),
              paceCoverage: requiredPace ? roundPercent(pace / requiredPace) : null,
              gap: roundMoney(target - scenarioCents.realistic),
              probability: chanceOf({ realized, target, realistic: scenarioCents.realistic, stdDev, daysLeft }),
            },
          ];
        }),
    ),
    trajectory: Object.fromEntries(
      Object.entries(SCENARIO_FACTORS).map(([name, factor]) => [name, trajectoryFor(factor)]),
    ),
  };
}

const cumulative = (values) => {
  let sum = 0;
  return values.map((value) => {
    sum += value;
    return fromCents(sum);
  });
};

export function getGoalProgress(db, month, now = new Date()) {
  const today = dayKeyOf(now);
  const weeks = monthWeeks(month);
  const days = monthDays(weeks);
  const configs = demoConfigs(db, month, now);
  const black = blackInfo(month, now);
  const empty = { month, today, weeks, days, black, total: null, segments: [], people: [], teams: [] };

  if (!configs.length) {
    return { ...empty, summary: { people: 0, reachedGoal: 0, reachedSuper: 0, reachedBlack: 0, onPace: 0, behind: 0 } };
  }

  const first = weeks[0].start;
  const last = weeks[weeks.length - 1].end;
  const dayIndex = new Map(days.map((day, index) => [day, index]));
  const dailyByKey = new Map();
  for (const sale of db.sales) {
    if (sale.dealStatus !== "ativa" || !sale.vendorId) continue;
    const index = dayIndex.get(dayKeyOf(sale.realizedAt));
    if (index === undefined) continue;
    const key = `${sale.vendorId}-${sale.funnelType}`;
    if (!dailyByKey.has(key)) dailyByKey.set(key, new Array(days.length).fill(0));
    dailyByKey.get(key)[index] += toCents(sale.value);
  }

  const sumRange = (daily, start, end) =>
    days.reduce((sum, day, index) => (day >= start && day <= end ? sum + daily[index] : sum), 0);
  const progressOf = (realized, tiers, start, end, ticket = null, conversion = null) => {
    const progress = tierProgress(realized, tiers);
    return {
      ...progress,
      pace: paceOf({ realized, goal: tiers.goal, start, end, today }),
      ...(ticket > 0 && { salesNeeded: Math.ceil(progress.remaining / ticket) }),
      ...(ticket > 0 &&
        conversion > 0 && { leadsNeeded: Math.ceil(progress.remaining / ((ticket * conversion) / 100)) }),
    };
  };
  const forecastOf = (dailyCents, tiers) => monthForecast({ days, dailyCents, tiers, today });
  const sumDaily = (list) => days.map((_, index) => list.reduce((sum, daily) => sum + daily[index], 0));
  const allByType = { farm: [], sales: [] };

  const people = [];
  const segments = [];
  for (const config of configs) {
    const levelOf = (type, key) => config.levels.find((item) => item.key === key && item.type === type) ?? null;
    const byType = typeTiers(
      black.active ? withSectorBlack(config, SECTOR_BLACK[config.segment]) : config,
      black.active,
    );
    const segmentTierValues = segmentTiers(byType);
    const tiersByPerson = peopleTiers(config.people, byType);
    const segmentPeople = config.people.map((person) => {
      const vendor = db.vendors.find((item) => item._id === person.vendorId);
      const team = db.teams.find((item) => item._id === vendor?.teamId);
      const daily = dailyByKey.get(`${person.vendorId}-${person.type}`) ?? new Array(days.length).fill(0);
      const realized = fromCents(daily.reduce((sum, value) => sum + value, 0));
      const tiers = tiersByPerson.get(person.vendorId);
      const personWeekTiers = dynamicWeekTiers({ personTiers: tiers, daily, days, weeks, today });
      const personLevel = levelOf(person.type, person.level);
      const ticket = config.tickets?.[person.type] ?? null;
      const conversion = config.conversion?.[person.type] ?? null;

      return {
        vendorId: person.vendorId,
        segment: config.segment,
        type: person.type,
        name: vendor?.vendorName ?? "Pessoa removida",
        job: vendor?.job ?? null,
        imageUrl: vendor?.imageUrl ?? null,
        teamId: vendor?.teamId ?? null,
        teamName: team?.name ?? null,
        level: person.level,
        levelName: personLevel?.name ?? person.level,
        ticket,
        conversion,
        month: progressOf(realized, tiers, first, last, ticket, conversion),
        forecast: forecastOf(daily, tiers),
        weeks: weeks.map((week, index) => ({
          index,
          start: week.start,
          end: week.end,
          ...progressOf(
            fromCents(sumRange(daily, week.start, week.end)),
            personWeekTiers[index],
            week.start,
            week.end,
            ticket,
            conversion,
          ),
        })),
        daily,
      };
    });

    const parts = segmentParts(config);
    const realizedOf = (list) => fromCents(list.reduce((sum, person) => sum + toCents(person.month.realized), 0));
    const segmentDaily = sumDaily(segmentPeople.map((person) => person.daily));
    allByType.farm.push(byType.farm);
    allByType.sales.push(byType.sales);

    segments.push({
      segment: config.segment,
      goal: segmentTierValues.goal,
      superPercent: config.superPercent,
      parts: Object.fromEntries(
        ["farm", "sales"].map((type) => [
          type,
          {
            goal: parts[type],
            ...progressOf(
              realizedOf(segmentPeople.filter((person) => person.type === type)),
              byType[type],
              first,
              last,
            ),
          },
        ]),
      ),
      month: progressOf(realizedOf(segmentPeople), segmentTierValues, first, last),
      forecast: forecastOf(segmentDaily, segmentTierValues),
      weeks: weeks.map((week, index) => ({
        index,
        start: week.start,
        end: week.end,
        ...progressOf(
          fromCents(sumRange(segmentDaily, week.start, week.end)),
          sumTiers(segmentPeople.map((person) => person.weeks[index].tiers)),
          week.start,
          week.end,
        ),
      })),
      cumulative: cumulative(segmentDaily),
    });
    people.push(...segmentPeople);
  }

  const totalDaily = sumDaily(people.map((person) => person.daily));
  const totalTiers = sumTiers(segments.map((item) => item.month.tiers));
  const totalRealized = (list) => fromCents(sumOf(list.map((person) => toCents(person.month.realized))));
  const total = {
    goal: totalTiers.goal,
    parts: Object.fromEntries(
      ["farm", "sales"].map((type) => {
        const typeTotal = sumTiers(allByType[type]);
        return [
          type,
          {
            goal: typeTotal.goal,
            ...progressOf(totalRealized(people.filter((person) => person.type === type)), typeTotal, first, last),
          },
        ];
      }),
    ),
    month: progressOf(totalRealized(people), totalTiers, first, last),
    forecast: forecastOf(totalDaily, totalTiers),
    weeks: weeks.map((week, index) => ({
      index,
      start: week.start,
      end: week.end,
      ...progressOf(
        fromCents(sumRange(totalDaily, week.start, week.end)),
        sumTiers(segments.map((item) => item.weeks[index].tiers)),
        week.start,
        week.end,
      ),
    })),
    cumulative: cumulative(totalDaily),
  };

  const teamsMap = new Map();
  for (const person of people) {
    const key = person.teamId ?? "sem-time";
    if (!teamsMap.has(key))
      teamsMap.set(key, { teamId: person.teamId, teamName: person.teamName ?? "Sem time", members: [] });
    teamsMap.get(key).members.push(person);
  }
  const goalShare = (item) => (item.month.tiers.goal > 0 ? item.month.realized / item.month.tiers.goal : 0);
  const teams = [...teamsMap.values()]
    .map((team) => {
      const tiers = sumTiers(team.members.map((person) => person.month.tiers));
      const realized = fromCents(team.members.reduce((sum, person) => sum + toCents(person.month.realized), 0));
      const teamDaily = days.map((_, index) => team.members.reduce((sum, person) => sum + person.daily[index], 0));
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        imageUrl: db.teams.find((item) => item._id === team.teamId)?.imageUrl ?? null,
        members: team.members.length,
        month: progressOf(realized, tiers, first, last),
        cumulative: cumulative(teamDaily),
      };
    })
    .sort((a, b) => goalShare(b) - goalShare(a));

  const reached = (tier) => people.filter((person) => person.month.reached.includes(tier)).length;
  return {
    ...empty,
    total,
    segments,
    people: people
      .map(({ daily, ...person }) => ({ ...person, cumulative: cumulative(daily) }))
      .sort((a, b) => goalShare(b) - goalShare(a) || a.name.localeCompare(b.name, "pt-BR")),
    teams,
    summary: {
      people: people.length,
      reachedGoal: reached("goal"),
      reachedSuper: reached("super"),
      reachedBlack: reached("black"),
      onPace: people.filter((person) => ["ahead", "done"].includes(person.month.pace.status)).length,
      behind: people.filter((person) => person.month.pace.status === "behind").length,
    },
  };
}

export function getGoalList(db, now = new Date()) {
  const month = currentMonthKey(now);
  const black = blackInfo(month, now);
  return demoConfigs(db, month, now).map((config) => {
    const byType = typeTiers(
      black.active ? withSectorBlack(config, SECTOR_BLACK[config.segment]) : config,
      black.active,
    );
    return {
      month,
      segment: config.segment,
      model: "levels",
      tiers: segmentTiers(byType),
      parts: byType,
      people: config.people.length,
      levels: config.levels.length,
      visibility: config.visibility,
      updatedBy: config.updatedBy,
      updatedAt: config.updatedAt,
    };
  });
}

export function getMonthTiers(db, month, segment, now = new Date()) {
  const configs = demoConfigs(db, month, now).filter((config) => !segment || config.segment === segment);
  if (!configs.length) return null;
  const black = blackInfo(month, now);
  return sumTiers(
    configs.map((config) =>
      segmentTiers(
        typeTiers(black.active ? withSectorBlack(config, SECTOR_BLACK[config.segment]) : config, black.active),
      ),
    ),
  );
}

const shiftMonth = (month, amount) => {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + amount, 1)).toISOString().slice(0, 7);
};

export function getGoalHistory(db, month, now = new Date(), count = 6) {
  const ranges = Array.from({ length: count }, (_, index) => shiftMonth(month, index - count + 1))
    .map((key) => ({ month: key, weeks: monthWeeks(key) }))
    .filter((item) => item.weeks.length);
  const monthOfDay = (day) =>
    ranges.findIndex((item) => day >= item.weeks[0].start && day <= item.weeks[item.weeks.length - 1].end);
  const cents = ranges.map(() => new Map());
  for (const sale of db.sales) {
    if (sale.dealStatus !== "ativa" || !sale.vendorId) continue;
    const index = monthOfDay(dayKeyOf(sale.realizedAt));
    if (index < 0) continue;
    const key = `${sale.vendorId}-${sale.funnelType}`;
    cents[index].set(key, (cents[index].get(key) ?? 0) + toCents(sale.value));
  }
  const black = blackInfo(month, now);

  return {
    month,
    black,
    months: ranges.map((item, index) => {
      const configs = demoConfigs(db, item.month, now);
      const isBlack = item.month === black.month;
      const realizedOf = (vendorId, type) => cents[index].get(`${vendorId}-${type}`) ?? 0;
      const people = [];
      const segments = {};

      for (const segment of SEGMENTS) {
        const config = configs.find((entry) => entry.segment === segment);
        let segmentPeople;
        let tiers = null;
        if (config) {
          const byType = typeTiers(isBlack ? withSectorBlack(config, SECTOR_BLACK[segment]) : config, isBlack);
          const tiersByPerson = peopleTiers(config.people, byType);
          tiers = segmentTiers(byType);
          segmentPeople = config.people.map((person) => ({
            vendorId: person.vendorId,
            segment,
            type: person.type,
            realized: fromCents(realizedOf(person.vendorId, person.type)),
            tiers: tiersByPerson.get(person.vendorId),
          }));
        } else {
          segmentPeople = segmentVendors(db, segment).map((vendor) => ({
            vendorId: vendor.vendorId,
            segment,
            type: vendor.type,
            realized: fromCents(realizedOf(vendor.vendorId, vendor.type)),
            tiers: null,
          }));
        }
        people.push(...segmentPeople);
        segments[segment] = {
          realized: fromCents(sumOf(segmentPeople.map((person) => toCents(person.realized)))),
          tiers,
        };
      }

      const withTiers = SEGMENTS.filter((segment) => segments[segment].tiers);
      return {
        month: item.month,
        start: item.weeks[0].start,
        end: item.weeks[item.weeks.length - 1].end,
        total: {
          realized: fromCents(sumOf(SEGMENTS.map((segment) => toCents(segments[segment].realized)))),
          tiers: withTiers.length ? sumTiers(withTiers.map((segment) => segments[segment].tiers)) : null,
        },
        segments,
        people,
      };
    }),
  };
}

export function getMyGoals(db, month, now = new Date(), vendorId = "vendor-brenda") {
  const progress = getGoalProgress(db, month, now);
  const history = getGoalHistory(db, month, now);
  const mine = (people) => people.filter((person) => person.vendorId === vendorId);

  return {
    month: progress.month,
    today: progress.today,
    weeks: progress.weeks,
    days: progress.days,
    black: progress.black,
    visibility: { open: true, hidden: [] },
    closed: false,
    person: mine(progress.people)[0] ?? null,
    history: {
      month: history.month,
      months: history.months.map((item) => ({ month: item.month, start: item.start, end: item.end, people: mine(item.people) })),
    },
  };
}
