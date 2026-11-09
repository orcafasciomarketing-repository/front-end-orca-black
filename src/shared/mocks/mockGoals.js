import { buildDraft, computeDraft, toPayload } from "../../features/goals/utils/goalDraft";
import {
  currentMonthKey,
  dayKeyOf,
  fromCents,
  monthDays,
  monthWeeks,
  paceOf,
  peopleTiers,
  segmentParts,
  segmentTiers,
  typeTiers,
  sumTiers,
  tierProgress,
  toCents,
  weekTiers,
} from "../../features/goals/utils/goalMath";

const SEGMENTS = ["b2b", "b2g"];

const DEMO_SETTINGS = {
  b2b: { farmGoal: 48000, salesGoal: 72000, superPercent: 125, farmBlack: 80000, salesBlack: 120000 },
  b2g: { farmGoal: 45000, salesGoal: 105000, superPercent: 120, farmBlack: 70000, salesBlack: 170000 },
};

const blackInfo = (month, now) => ({
  month: currentMonthKey(now),
  active: month === currentMonthKey(now),
  total: 440000,
  suggestedGoals: { b2b: 200000, b2g: 240000 },
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
  const weeks = monthWeeks(month);
  const vendors = segmentVendors(db, segment);
  const draft = buildDraft({ config: null, previous: null, vendors }, weeks.length);
  const levelKeys = draft.levels.map((level) => level.key);
  const withSettings = {
    ...draft,
    ...DEMO_SETTINGS[segment],
    people: draft.people.map((person, index) => ({ ...person, level: levelKeys[index % levelKeys.length] })),
  };
  const black = { active: true };
  const payload = toPayload(withSettings, computeDraft(withSettings, weeks.length, black), black);

  return {
    month,
    ...payload,
    people: payload.people.map((person) => ({
      ...person,
      type: vendors.find((vendor) => vendor.vendorId === person.vendorId).type,
    })),
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
  const empty = { month, today, weeks, days, black, segments: [], people: [], teams: [] };

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
  const progressOf = (realized, tiers, start, end) => ({
    ...tierProgress(realized, tiers),
    pace: paceOf({ realized, goal: tiers.goal, start, end, today }),
  });

  const people = [];
  const segments = [];
  for (const config of configs) {
    const levelNames = new Map(config.levels.map((level) => [level.key, level.name]));
    const byType = typeTiers(config, black.active);
    const segmentTierValues = segmentTiers(byType);
    const tiersByPerson = peopleTiers(config.people, byType);
    const segmentPeople = config.people.map((person) => {
      const vendor = db.vendors.find((item) => item._id === person.vendorId);
      const team = db.teams.find((item) => item._id === vendor?.teamId);
      const daily = dailyByKey.get(`${person.vendorId}-${person.type}`) ?? new Array(days.length).fill(0);
      const realized = fromCents(daily.reduce((sum, value) => sum + value, 0));
      const tiers = tiersByPerson.get(person.vendorId);
      const personWeekTiers = weekTiers(
        tiers,
        weeks.map((_, index) => person.weeks[index] ?? 0),
      );

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
        levelName: levelNames.get(person.level) ?? person.level,
        month: progressOf(realized, tiers, first, last),
        weeks: weeks.map((week, index) => ({
          index,
          start: week.start,
          end: week.end,
          ...progressOf(fromCents(sumRange(daily, week.start, week.end)), personWeekTiers[index], week.start, week.end),
        })),
        daily,
      };
    });

    const parts = segmentParts(config);
    const realizedOf = (list) => fromCents(list.reduce((sum, person) => sum + toCents(person.month.realized), 0));
    const segmentDaily = days.map((_, index) => segmentPeople.reduce((sum, person) => sum + person.daily[index], 0));

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
