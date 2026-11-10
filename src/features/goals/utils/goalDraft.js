import {
  DEFAULT_SUPER_PERCENT,
  DEFAULT_LEVELS,
  distributeByWeight,
  fromCents,
  segmentParts,
  shareLike,
  segmentTiers,
  typeTiers,
  withSectorBlack,
  splitEqually,
  toCents,
} from "./goalMath";

const TYPES = ["farm", "sales"];

const EXTRA_TIERS = ["super", "black"];

const MANUAL_FIELDS = { super: "manualSuper", black: "manualBlack" };

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
    manualSuper: null,
    manualBlack: null,
    manualWeeks: null,
  };
}

const NO_BLACK = { active: false };

export function computeDraft(draft, weeksCount, black = NO_BLACK) {
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

  const sectorBlack = Number(black.sectorGoal) || 0;
  const byType = typeTiers(black.active ? withSectorBlack(draft, sectorBlack) : draft, black.active);
  const tiers = segmentTiers(byType);
  const tierCents = { super: new Map(), black: new Map() };
  const tierDistributed = { super: {}, black: {} };
  for (const tier of EXTRA_TIERS) {
    const field = MANUAL_FIELDS[tier];
    for (const type of TYPES) {
      const members = draft.people.filter((person) => person.included && person.type === type);
      const manual = tier === "black" && !black.active ? [] : members.filter((person) => person[field] !== null);
      const auto = members.filter((person) => !manual.includes(person));
      manual.forEach((person) => tierCents[tier].set(person.vendorId, toCents(person[field])));
      const manualCents = manual.reduce((sum, person) => sum + toCents(person[field]), 0);
      const shares = shareLike(
        Math.max(toCents(byType[type][tier]) - manualCents, 0),
        auto.map((person) => person.vendorId),
        auto.map((person) => goals.get(person.vendorId) ?? 0),
      );
      auto.forEach((person) => tierCents[tier].set(person.vendorId, shares.get(person.vendorId) ?? 0));
      tierDistributed[tier][type] = fromCents(
        members.reduce((sum, person) => sum + tierCents[tier].get(person.vendorId), 0),
      );
    }
  }

  const people = draft.people.map((person) => {
    if (!person.included) return { ...person, goal: 0, tiers: null, weeks: [], weeksOk: true };
    const goalCents = goals.get(person.vendorId) ?? 0;
    const weeks = person.manualWeeks ?? splitEqually(goalCents, weeksCount).map(fromCents);
    const weeksCents = weeks.reduce((sum, value) => sum + toCents(value), 0);
    const superCents = tierCents.super.get(person.vendorId) ?? 0;
    const blackCents = tierCents.black.get(person.vendorId) ?? 0;
    return {
      ...person,
      goal: fromCents(goalCents),
      tiers: { goal: fromCents(goalCents), super: fromCents(superCents), black: fromCents(blackCents) },
      weeks,
      weeksOk: weeksCents === goalCents,
      superOk: superCents >= goalCents,
      blackOk: !black.active || blackCents >= superCents,
    };
  });

  const partsOk = Object.fromEntries(TYPES.map((type) => [type, sameCents(distributed[type], parts[type])]));
  const tiersOk = Object.fromEntries(
    EXTRA_TIERS.map((tier) => [
      tier,
      Object.fromEntries(
        TYPES.map((type) => [
          type,
          (tier === "black" && !black.active) || sameCents(tierDistributed[tier][type], byType[type][tier]),
        ]),
      ),
    ]),
  );
  const levelsOk =
    draft.levels.length > 0 &&
    draft.levels.every((level) => level.name.trim() && Number(level.weight) > 0) &&
    people.every((person) => !person.included || weightOf.has(person.level));
  const blackOk = Object.fromEntries(
    TYPES.map((type) => [type, !black.active || byType[type].goal === 0 || byType[type].black > byType[type].super]),
  );
  const superOk = Number(draft.superPercent) > 100;
  const sectorBlackOk = !black.active || (sectorBlack > 0 && toCents(draft.farmBlack) <= toCents(sectorBlack));
  const valuesOk = superOk && sectorBlackOk && blackOk.farm && blackOk.sales;

  return {
    tiers,
    byType,
    superOk,
    sectorBlackOk,
    blackOk,
    parts,
    distributed,
    partsOk,
    tierDistributed,
    tiersOk,
    levelsOk,
    valuesOk,
    people,
    canSave:
      tiers.goal > 0 &&
      valuesOk &&
      levelsOk &&
      partsOk.farm &&
      partsOk.sales &&
      EXTRA_TIERS.every((tier) => tiersOk[tier].farm && tiersOk[tier].sales) &&
      people.every((person) => person.weeksOk && person.superOk && person.blackOk),
  };
}

function keepSavedTiers(draft, saved, weeksCount, black) {
  let result = draft;
  for (const tier of EXTRA_TIERS) {
    if (tier === "black" && !black.active) continue;
    const field = `${tier}Goal`;
    const auto = computeDraft(result, weeksCount, black);
    const mismatchTypes = new Set(
      auto.people
        .filter((person) => person.included && saved.get(person.vendorId)[field] != null)
        .filter((person) => !sameCents(person.tiers[tier], saved.get(person.vendorId)[field]))
        .map((person) => person.type),
    );
    result = {
      ...result,
      people: result.people.map((person) =>
        person.included && mismatchTypes.has(person.type)
          ? { ...person, [MANUAL_FIELDS[tier]]: saved.get(person.vendorId)[field] ?? 0 }
          : person,
      ),
    };
  }
  return result;
}

function fromConfig(config, vendors, weeksCount, { keepGoals, black = NO_BLACK }) {
  const saved = new Map(config.people.map((person) => [person.vendorId, person]));
  const levelKeys = config.levels.map((level) => level.key);
  const draft = {
    farmGoal: config.farmGoal,
    salesGoal: config.salesGoal,
    superPercent: config.superPercent,
    farmBlack: config.farmBlack ?? "",
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

  const withGoals = {
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

  return keepSavedTiers(withGoals, saved, weeksCount, black);
}

export function buildDraft(segmentData, weeksCount, black = NO_BLACK) {
  const { config, previous, vendors } = segmentData;

  if (config) {
    return {
      source: "saved",
      sourceMonth: config.month,
      ...fromConfig(config, vendors, weeksCount, { keepGoals: true, black }),
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
    farmGoal: "",
    salesGoal: "",
    superPercent: DEFAULT_SUPER_PERCENT,
    farmBlack: "",
    levels: DEFAULT_LEVELS.map((level) => ({ ...level })),
    people: vendors.map((vendor) => ({ ...basePerson(vendor), level: DEFAULT_LEVELS[0].key })),
  };
}

export function toPayload(draft, computed, black = NO_BLACK) {
  return {
    farmGoal: fromCents(toCents(draft.farmGoal)),
    salesGoal: fromCents(toCents(draft.salesGoal)),
    superPercent: Number(draft.superPercent),
    farmBlack: black.active ? fromCents(toCents(draft.farmBlack)) : null,
    levels: draft.levels.map((level) => ({ key: level.key, name: level.name.trim(), weight: Number(level.weight) })),
    people: computed.people
      .filter((person) => person.included)
      .map((person) => ({
        vendorId: person.vendorId,
        level: person.level,
        goal: person.goal,
        superGoal: person.tiers.super,
        blackGoal: black.active ? person.tiers.black : null,
        weeks: person.weeks.map((value) => fromCents(toCents(value))),
      })),
  };
}

export function nextLevelKey(levels) {
  let index = levels.length + 1;
  while (levels.some((level) => level.key === `nivel-${index}`)) index += 1;
  return `nivel-${index}`;
}
