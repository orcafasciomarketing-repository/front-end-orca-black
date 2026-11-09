import {
  DEFAULT_LEVELS,
  DEFAULT_PERCENTS,
  distributeByWeight,
  fromCents,
  segmentParts,
  splitEqually,
  toCents,
} from "./goalMath";

const TYPES = ["farm", "sales"];

const sameCents = (a, b) => toCents(a) === toCents(b);

function basePerson(vendor) {
  return {
    vendorId: vendor.vendorId,
    name: vendor.name,
    job: vendor.job,
    imageUrl: vendor.imageUrl,
    teamName: vendor.teamName,
    type: vendor.type,
    included: true,
    level: "",
    manualGoal: null,
    manualWeeks: null,
  };
}

export function computeDraft(draft, weeksCount) {
  const parts = segmentParts(draft);
  const weightOf = new Map(draft.levels.map((level) => [level.key, Number(level.weight) || 0]));
  const goals = new Map();
  const distributed = {};

  for (const type of TYPES) {
    const members = draft.people.filter((person) => person.included && person.type === type);
    const manual = members.filter((person) => person.manualGoal !== null);
    const auto = members.filter((person) => person.manualGoal === null);
    manual.forEach((person) => goals.set(person.vendorId, toCents(person.manualGoal)));
    const manualCents = manual.reduce((sum, person) => sum + toCents(person.manualGoal), 0);
    const rest = Math.max(toCents(parts[type]) - manualCents, 0);
    const shares = distributeByWeight(
      rest,
      auto.map((person) => ({ key: person.vendorId, weight: weightOf.get(person.level) ?? 0 })),
    );
    auto.forEach((person) => goals.set(person.vendorId, shares.get(person.vendorId) ?? 0));
    distributed[type] = fromCents(members.reduce((sum, person) => sum + goals.get(person.vendorId), 0));
  }

  const people = draft.people.map((person) => {
    if (!person.included) return { ...person, goal: 0, weeks: [], weeksOk: true };
    const goalCents = goals.get(person.vendorId) ?? 0;
    const weeks = person.manualWeeks ?? splitEqually(goalCents, weeksCount).map(fromCents);
    const weeksCents = weeks.reduce((sum, value) => sum + toCents(value), 0);
    return { ...person, goal: fromCents(goalCents), weeks, weeksOk: weeksCents === goalCents };
  });

  const partsOk = Object.fromEntries(TYPES.map((type) => [type, sameCents(distributed[type], parts[type])]));
  const levelsOk =
    draft.levels.length > 0 &&
    draft.levels.every((level) => level.name.trim() && Number(level.weight) > 0) &&
    people.every((person) => !person.included || weightOf.has(person.level));
  const percentsOk =
    Number(draft.superPercent) > 100 &&
    Number(draft.blackPercent) > Number(draft.superPercent) &&
    Number(draft.farmPercent) >= 0 &&
    Number(draft.farmPercent) <= 100;

  return {
    parts,
    distributed,
    partsOk,
    levelsOk,
    percentsOk,
    people,
    canSave:
      toCents(draft.goal) > 0 &&
      percentsOk &&
      levelsOk &&
      partsOk.farm &&
      partsOk.sales &&
      people.every((person) => person.weeksOk),
  };
}

function fromConfig(config, vendors, weeksCount, { keepGoals }) {
  const saved = new Map(config.people.map((person) => [person.vendorId, person]));
  const levelKeys = config.levels.map((level) => level.key);
  const draft = {
    goal: config.goal,
    farmPercent: config.farmPercent,
    superPercent: config.superPercent,
    blackPercent: config.blackPercent,
    levels: config.levels.map((level) => ({ ...level })),
    people: vendors.map((vendor) => {
      const person = saved.get(vendor.vendorId);
      return {
        ...basePerson(vendor),
        included: keepGoals ? Boolean(person) : true,
        level: person && levelKeys.includes(person.level) ? person.level : levelKeys[0],
      };
    }),
  };

  if (!keepGoals) return draft;

  const auto = computeDraft(draft, weeksCount);
  const mismatchTypes = new Set(
    auto.people
      .filter((person) => person.included && !sameCents(person.goal, saved.get(person.vendorId).goal))
      .map((person) => person.type),
  );

  return {
    ...draft,
    people: draft.people.map((person) => {
      const savedPerson = saved.get(person.vendorId);
      if (!person.included) return person;
      const manualGoal = mismatchTypes.has(person.type) ? savedPerson.goal : null;
      const equalWeeks = splitEqually(toCents(savedPerson.goal), weeksCount).map(fromCents);
      const sameWeeks =
        savedPerson.weeks.length === weeksCount &&
        savedPerson.weeks.every((value, index) => sameCents(value, equalWeeks[index]));
      return { ...person, manualGoal, manualWeeks: sameWeeks ? null : [...savedPerson.weeks] };
    }),
  };
}

export function buildDraft(segmentData, weeksCount) {
  const { config, previous, vendors } = segmentData;

  if (config) {
    return {
      source: "saved",
      sourceMonth: config.month,
      ...fromConfig(config, vendors, weeksCount, { keepGoals: true }),
    };
  }

  if (previous) {
    return {
      source: "previous",
      sourceMonth: previous.month,
      ...fromConfig(previous, vendors, weeksCount, { keepGoals: false }),
    };
  }

  return {
    source: "new",
    sourceMonth: null,
    goal: "",
    ...DEFAULT_PERCENTS,
    levels: DEFAULT_LEVELS.map((level) => ({ ...level })),
    people: vendors.map((vendor) => ({ ...basePerson(vendor), level: DEFAULT_LEVELS[0].key })),
  };
}

export function toPayload(draft, computed) {
  return {
    goal: fromCents(toCents(draft.goal)),
    farmPercent: Number(draft.farmPercent),
    superPercent: Number(draft.superPercent),
    blackPercent: Number(draft.blackPercent),
    levels: draft.levels.map((level) => ({ key: level.key, name: level.name.trim(), weight: Number(level.weight) })),
    people: computed.people
      .filter((person) => person.included)
      .map((person) => ({
        vendorId: person.vendorId,
        level: person.level,
        goal: person.goal,
        weeks: person.weeks.map((value) => fromCents(toCents(value))),
      })),
  };
}

export function nextLevelKey(levels) {
  let index = levels.length + 1;
  while (levels.some((level) => level.key === `nivel-${index}`)) index += 1;
  return `nivel-${index}`;
}
