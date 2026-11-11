import {
  DEFAULT_LEVEL_NAMES,
  DEFAULT_CONVERSION,
  DEFAULT_TICKET,
  fromCents,
  GOAL_TYPES,
  segmentTiers,
  toCents,
  typeTiers,
} from "./goalMath";

const sameCents = (a, b) => toCents(a) === toCents(b);

const isFilled = (value) => value !== "" && value !== null && value !== undefined && Number.isFinite(Number(value));

const slug = (name) =>
  String(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "nivel";

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
    manualSuper: null,
    manualBlack: null,
  };
}

const NO_BLACK = { active: false };

export const levelsOfType = (levels, type) => levels.filter((level) => level.type === type);

const findLevel = (levels, type, key) => levels.find((level) => level.type === type && level.key === key) ?? null;

const firstLevelKey = (levels, type) => levelsOfType(levels, type)[0]?.key ?? "";

export function levelProblems(level, black = NO_BLACK) {
  const problems = [];
  if (!String(level.name ?? "").trim()) problems.push("name");
  if (!isFilled(level.goal) || Number(level.goal) < 0) problems.push("goal");
  if (!isFilled(level.superGoal) || toCents(level.superGoal) < toCents(level.goal)) problems.push("super");
  if (black.active && (!isFilled(level.blackGoal) || toCents(level.blackGoal) < toCents(level.superGoal))) {
    problems.push("black");
  }
  return problems;
}

export function computeDraft(draft, black = NO_BLACK) {
  const goals = new Map();
  const supers = new Map();
  const blacks = new Map();
  const totals = { farm: { goal: 0, super: 0, black: 0 }, sales: { goal: 0, super: 0, black: 0 } };

  for (const person of draft.people) {
    if (!person.included) continue;
    const level = findLevel(draft.levels, person.type, person.level);
    const goalCents = toCents(person.manualGoal ?? level?.goal ?? 0);
    const superCents = toCents(person.manualSuper ?? level?.superGoal ?? 0);
    const blackCents = black.active ? toCents(person.manualBlack ?? level?.blackGoal ?? 0) : 0;
    goals.set(person.vendorId, goalCents);
    supers.set(person.vendorId, superCents);
    blacks.set(person.vendorId, blackCents);
    totals[person.type].goal += goalCents;
    totals[person.type].super += superCents;
    totals[person.type].black += blackCents;
  }

  const config = {
    farmGoal: fromCents(totals.farm.goal),
    salesGoal: fromCents(totals.sales.goal),
    farmSuper: fromCents(totals.farm.super),
    salesSuper: fromCents(totals.sales.super),
    farmBlack: fromCents(totals.farm.black),
    salesBlack: fromCents(totals.sales.black),
  };
  const byType = typeTiers(config, black.active);
  const tiers = segmentTiers(byType);
  const blackDistributed = Object.fromEntries(GOAL_TYPES.map((type) => [type, fromCents(totals[type].black)]));

  const people = draft.people.map((person) => {
    if (!person.included) return { ...person, goal: 0, tiers: null, levelOk: true, superOk: true, blackOk: true };
    const goalCents = goals.get(person.vendorId);
    const superCents = supers.get(person.vendorId);
    const personBlack = blacks.get(person.vendorId);
    return {
      ...person,
      goal: fromCents(goalCents),
      tiers: { goal: fromCents(goalCents), super: fromCents(superCents), black: fromCents(personBlack) },
      levelOk: Boolean(findLevel(draft.levels, person.type, person.level)),
      superOk: superCents >= goalCents,
      blackOk: !black.active || personBlack >= superCents,
    };
  });

  const levels = draft.levels.map((level) => ({ ...level, problems: levelProblems(level, black) }));
  const levelsOk =
    GOAL_TYPES.every((type) => levelsOfType(draft.levels, type).length > 0) &&
    levels.every((level) => level.problems.length === 0);
  const blackTiersOk = Object.fromEntries(GOAL_TYPES.map((type) => [type, true]));
  const blackFilled = Object.fromEntries(
    GOAL_TYPES.map((type) => [
      type,
      !black.active || levelsOfType(draft.levels, type).every((level) => isFilled(level.blackGoal)),
    ]),
  );
  const blackOk = Object.fromEntries(
    GOAL_TYPES.map((type) => [
      type,
      !black.active ||
        byType[type].goal === 0 ||
        (blackFilled[type] && toCents(byType[type].black) >= toCents(byType[type].super)),
    ]),
  );
  const ticketsOk = GOAL_TYPES.every((type) => !isFilled(draft.tickets?.[type]) || Number(draft.tickets[type]) >= 0);
  const conversionOk = Object.fromEntries(
    GOAL_TYPES.map((type) => {
      const value = draft.conversion?.[type];
      return [type, !isFilled(value) || (Number(value) > 0 && Number(value) <= 100)];
    }),
  );

  return {
    tiers,
    byType,
    levels,
    levelsOk,
    blackFilled,
    blackOk,
    blackDistributed,
    blackTiersOk,
    ticketsOk,
    conversionOk,
    people,
    canSave:
      tiers.goal > 0 &&
      levelsOk &&
      ticketsOk &&
      GOAL_TYPES.every((type) => conversionOk[type]) &&
      GOAL_TYPES.every((type) => blackOk[type]) &&
      people.every((person) => person.levelOk && person.superOk && person.blackOk),
  };
}

function legacyLevels(config) {
  return GOAL_TYPES.flatMap((type) =>
    config.levels.map((level) => {
      const base = config.people.find((person) => person.type === type && person.level === level.key);
      const goal = base?.goal ?? 0;
      const superGoal =
        base?.superGoal ?? fromCents(Math.round((toCents(goal) * Number(config.superPercent || 0)) / 100));
      return { key: level.key, name: level.name, type, goal, superGoal, blackGoal: null };
    }),
  );
}

function levelsFromConfig(config) {
  if (config.model === "levels" || config.levels.some((level) => level.type)) {
    return config.levels.map((level) => ({
      key: level.key,
      name: level.name,
      type: level.type,
      goal: level.goal ?? 0,
      superGoal: level.superGoal ?? 0,
      blackGoal: level.blackGoal ?? null,
    }));
  }
  return legacyLevels(config);
}

const conversionFrom = (config) =>
  config ? { farm: config.conversion?.farm ?? "", sales: config.conversion?.sales ?? "" } : { ...DEFAULT_CONVERSION };

const ticketsFrom = (config) => ({
  farm: config?.tickets?.farm ?? DEFAULT_TICKET,
  sales: config?.tickets?.sales ?? DEFAULT_TICKET,
});

const mostCommon = (values) => {
  const counts = new Map();
  values.forEach((value) => counts.set(toCents(value), (counts.get(toCents(value)) ?? 0) + 1));
  const [cents] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  return cents === undefined ? null : fromCents(cents);
};

function withLevelBlacks(levels, config) {
  return levels.map((level) => {
    if (level.blackGoal != null) return level;
    const saved = config.people
      .filter((person) => person.type === level.type && person.level === level.key && person.blackGoal != null)
      .map((person) => person.blackGoal);
    return { ...level, blackGoal: mostCommon(saved) ?? "" };
  });
}

function fromConfig(config, vendors, { keepGoals, black = NO_BLACK }) {
  const saved = new Map(config.people.map((person) => [person.vendorId, person]));
  const baseLevels = levelsFromConfig(config);
  const levels = keepGoals && black.active ? withLevelBlacks(baseLevels, config) : baseLevels.map((level) => ({ ...level, blackGoal: level.blackGoal ?? "" }));
  return {
    tickets: ticketsFrom(config),
    conversion: conversionFrom(config),
    levels,
    people: vendors.map((vendor) => {
      const person = saved.get(vendor.vendorId);
      const level =
        person && findLevel(levels, vendor.type, person.level) ? person.level : firstLevelKey(levels, vendor.type);
      if (!keepGoals) return { ...basePerson(vendor), level };
      if (!person) return { ...basePerson(vendor), included: false, level };
      const levelValues = findLevel(levels, vendor.type, level);
      return {
        ...basePerson(vendor),
        level,
        manualGoal: levelValues && sameCents(levelValues.goal, person.goal) ? null : person.goal,
        manualSuper:
          person.superGoal == null || (levelValues && sameCents(levelValues.superGoal, person.superGoal))
            ? null
            : person.superGoal,
        manualBlack:
          !black.active ||
          person.blackGoal == null ||
          (levelValues && isFilled(levelValues.blackGoal) && sameCents(levelValues.blackGoal, person.blackGoal))
            ? null
            : person.blackGoal,
      };
    }),
  };
}

function newLevels() {
  return GOAL_TYPES.flatMap((type) =>
    DEFAULT_LEVEL_NAMES.map((name) => ({
      key: slug(name),
      name,
      type,
      goal: "",
      superGoal: "",
      blackGoal: "",
    })),
  );
}

export function buildDraft(segmentData, black = NO_BLACK) {
  const { config, previous, vendors } = segmentData;

  if (config) {
    return {
      source: "saved",
      sourceMonth: config.month,
      legacy: !(config.model === "levels" || config.levels.some((level) => level.type)),
      ...fromConfig(config, vendors, { keepGoals: true, black }),
    };
  }

  if (previous) {
    return {
      source: "previous",
      sourceMonth: previous.month,
      legacy: false,
      ...fromConfig(previous, vendors, { keepGoals: false }),
    };
  }

  const levels = newLevels();
  return {
    source: "new",
    sourceMonth: null,
    legacy: false,
    tickets: ticketsFrom(null),
    conversion: conversionFrom(null),
    levels,
    people: vendors.map((vendor) => ({ ...basePerson(vendor), level: firstLevelKey(levels, vendor.type) })),
  };
}

const rateValue = (value) => (isFilled(value) && Number(value) > 0 ? Number(value) : null);

const ticketValue = (value) => (isFilled(value) && Number(value) > 0 ? fromCents(toCents(value)) : null);

export function toPayload(draft, computed, black = NO_BLACK) {
  return {
    levels: draft.levels.map((level) => ({
      key: level.key,
      name: level.name.trim(),
      type: level.type,
      goal: fromCents(toCents(level.goal)),
      superGoal: fromCents(toCents(level.superGoal)),
      blackGoal: black.active ? fromCents(toCents(level.blackGoal)) : null,
    })),
    tickets: { farm: ticketValue(draft.tickets?.farm), sales: ticketValue(draft.tickets?.sales) },
    conversion: { farm: rateValue(draft.conversion?.farm), sales: rateValue(draft.conversion?.sales) },
    farmBlack: black.active ? computed.byType.farm.black : null,
    salesBlack: black.active ? computed.byType.sales.black : null,
    people: computed.people
      .filter((person) => person.included)
      .map((person) => ({
        vendorId: person.vendorId,
        level: person.level,
        goal: person.tiers.goal,
        superGoal: person.tiers.super,
        blackGoal: black.active ? person.tiers.black : null,
      })),
  };
}

export function nextLevelKey(levels, type) {
  const keys = new Set(levelsOfType(levels, type).map((level) => level.key));
  let index = keys.size + 1;
  while (keys.has(`nivel-${index}`)) index += 1;
  return `nivel-${index}`;
}

export function newLevel(levels, type) {
  return {
    key: nextLevelKey(levels, type),
    name: "",
    type,
    goal: "",
    superGoal: "",
    blackGoal: "",
  };
}
