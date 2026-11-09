import { describe, expect, it } from "vitest";

import { buildDraft, computeDraft, toPayload } from "./goalDraft";
import { monthWeeks, paceOf, peopleTiers, segmentTiers, tierProgress, typeTiers, weekTiers } from "./goalMath";

const vendors = [
  { vendorId: "v1", name: "Ana", job: "B2B Venda", type: "sales" },
  { vendorId: "v2", name: "Bia", job: "B2B Venda", type: "sales" },
  { vendorId: "v3", name: "Caio", job: "B2B Farmer", type: "farm" },
];

const newDraft = (changes = {}) => {
  const draft = buildDraft({ config: null, previous: null, vendors }, 4);
  return {
    ...draft,
    farmGoal: 3000,
    salesGoal: 7000,
    superPercent: 120,
    farmBlack: 4500,
    salesBlack: 10500,
    ...changes,
  };
};

describe("goalMath (mesmas regras do backend)", () => {
  it("semanas que começam no mês, de segunda a domingo", () => {
    expect(monthWeeks("2026-11").map((week) => week.start)).toEqual([
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
      "2026-11-30",
    ]);
  });

  it("partes do setor; Super e Black descem para as pessoas na proporção da Meta e para as semanas", () => {
    const byType = typeTiers(
      { farmGoal: 3000, salesGoal: 7000, superPercent: 120, farmBlack: 4500, salesBlack: 10500 },
      true,
    );
    expect(byType).toEqual({
      farm: { goal: 3000, super: 3600, black: 4500 },
      sales: { goal: 7000, super: 8400, black: 10500 },
    });
    expect(segmentTiers(byType)).toEqual({ goal: 10000, super: 12000, black: 15000 });

    const people = [
      { vendorId: "jr", type: "sales", goal: 1000 },
      { vendorId: "sr", type: "sales", goal: 2000 },
      { vendorId: "fa", type: "farm", goal: 1000 },
    ];
    const byPerson = peopleTiers(people, {
      sales: { goal: 3000, super: 4500, black: 9000 },
      farm: { goal: 1000, super: 1500, black: 3000 },
    });
    expect(byPerson.get("sr")).toEqual({ goal: 2000, super: 3000, black: 6000 });
    expect(weekTiers(byPerson.get("jr"), [400, 600])).toEqual([
      { goal: 400, super: 600, black: 1200 },
      { goal: 600, super: 900, black: 1800 },
    ]);
  });

  it("sem Meta black (fora do mês da campanha), bateu a Super o resto é excedente", () => {
    expect(tierProgress(1300, { goal: 1000, super: 1200, black: 0 })).toMatchObject({
      available: ["goal", "super"],
      current: "super",
      excess: 100,
    });
  });

  it("faixa atual sobe de Meta para Super e Black; o que passa da Black é excedente", () => {
    const tiers = { goal: 1000, super: 1200, black: 1500 };
    expect(tierProgress(999, tiers).current).toBe("goal");
    expect(tierProgress(1000, tiers).current).toBe("super");
    expect(tierProgress(1200, tiers).current).toBe("black");
    expect(tierProgress(1800, tiers)).toMatchObject({ current: "black", excess: 300, percent: 120 });
  });

  it("ritmo: atrasado, no ritmo e batida", () => {
    const base = { goal: 700, start: "2026-11-02", end: "2026-11-08", today: "2026-11-05" };
    expect(paceOf({ ...base, realized: 100 }).status).toBe("behind");
    expect(paceOf({ ...base, realized: 400 }).status).toBe("ahead");
    expect(paceOf({ ...base, realized: 700 }).status).toBe("done");
  });
});

describe("goalDraft (rascunho da tela de cadastro)", () => {
  it("divide cada parte pelos pesos e cada pessoa igualmente nas semanas; tudo fecha", () => {
    const draft = newDraft();
    draft.people = draft.people.map((person) => ({ ...person, level: person.vendorId === "v2" ? "senior" : "junior" }));

    const computed = computeDraft(draft, 4);
    const goals = Object.fromEntries(computed.people.map((person) => [person.vendorId, person.goal]));

    expect(goals).toEqual({ v1: 2333.33, v2: 4666.67, v3: 3000 });
    expect(computed.people.find((person) => person.vendorId === "v1").weeks).toEqual([583.34, 583.33, 583.33, 583.33]);
    expect(computed.partsOk).toEqual({ farm: true, sales: true });
    expect(computed.canSave).toBe(true);
  });

  it("ajuste à mão em uma pessoa: o resto da parte vai para as outras pelos pesos", () => {
    const draft = newDraft();
    draft.people = draft.people.map((person) =>
      person.vendorId === "v1" ? { ...person, manualGoal: "5000" } : person,
    );

    const computed = computeDraft(draft, 4);

    expect(computed.people.find((person) => person.vendorId === "v2").goal).toBe(2000);
    expect(computed.canSave).toBe(true);
  });

  it("não deixa salvar quando a soma das semanas não bate ou a parte não fecha", () => {
    const draft = newDraft();
    draft.people = draft.people.map((person) =>
      person.vendorId === "v3" ? { ...person, manualWeeks: ["1000", "1000", "1000", "1"] } : person,
    );
    expect(computeDraft(draft, 4).canSave).toBe(false);

    const allManual = newDraft();
    allManual.people = allManual.people.map((person) => ({ ...person, manualGoal: "1" }));
    const computed = computeDraft(allManual, 4);
    expect(computed.partsOk).toEqual({ farm: false, sales: false });
    expect(computed.canSave).toBe(false);
  });

  it("Super acima de 100% da Meta; no mês da campanha, a Black de cada parte maior que a Super dela", () => {
    expect(computeDraft(newDraft({ superPercent: 100 }), 4).canSave).toBe(false);
    expect(computeDraft(newDraft({ farmBlack: 3000 }), 4, { active: true }).canSave).toBe(false);
    expect(computeDraft(newDraft({ farmBlack: 3000 }), 4).canSave).toBe(true);
    expect(computeDraft(newDraft(), 4, { active: true }).canSave).toBe(true);
  });

  it("mostra a Super e a Black de cada pessoa e só manda a Black no mês da campanha", () => {
    const draft = newDraft();
    const black = { active: true };
    const computed = computeDraft(draft, 4, black);
    const v3 = computed.people.find((person) => person.vendorId === "v3");

    expect(v3.tiers).toEqual({ goal: 3000, super: 3600, black: 4500 });
    expect(toPayload(draft, computed, black)).toMatchObject({
      farmGoal: 3000,
      salesGoal: 7000,
      superPercent: 120,
      farmBlack: 4500,
      salesBlack: 10500,
    });
    expect(toPayload(draft, computeDraft(draft, 4))).toMatchObject({ farmBlack: null, salesBlack: null });
  });

  it("quem fica sem meta não entra na divisão nem no envio", () => {
    const draft = newDraft();
    draft.people = draft.people.map((person) => (person.vendorId === "v2" ? { ...person, included: false } : person));

    const computed = computeDraft(draft, 4);
    const payload = toPayload(draft, computed);

    expect(computed.people.find((person) => person.vendorId === "v1").goal).toBe(7000);
    expect(payload.people.map((person) => person.vendorId)).toEqual(["v1", "v3"]);
  });

  it("mês salvo volta exatamente como foi salvo, inclusive ajustes à mão", () => {
    const config = {
      month: "2026-11",
      farmGoal: 3000,
      salesGoal: 7000,
      superPercent: 120,
      farmBlack: null,
      salesBlack: null,
      levels: [{ key: "junior", name: "Júnior", weight: 1 }],
      people: [
        { vendorId: "v1", type: "sales", level: "junior", goal: 6000, weeks: [3000, 1000, 1000, 1000] },
        { vendorId: "v2", type: "sales", level: "junior", goal: 1000, weeks: [250, 250, 250, 250] },
        { vendorId: "v3", type: "farm", level: "junior", goal: 3000, weeks: [750, 750, 750, 750] },
      ],
    };

    const draft = buildDraft({ config, previous: null, vendors }, 4);
    const computed = computeDraft(draft, 4);

    expect(draft.source).toBe("saved");
    expect(toPayload(draft, computed).people).toEqual(
      config.people.map(({ vendorId, level, goal, weeks }) => ({ vendorId, level, goal, weeks })),
    );
    expect(computed.canSave).toBe(true);
  });

  it("mês novo copia do anterior os percentuais, níveis e o nível de cada pessoa, e redistribui", () => {
    const previous = {
      month: "2026-10",
      farmGoal: 4000,
      salesGoal: 4000,
      superPercent: 125,
      farmBlack: null,
      salesBlack: null,
      levels: [
        { key: "a", name: "A", weight: 1 },
        { key: "b", name: "B", weight: 3 },
      ],
      people: [{ vendorId: "v2", type: "sales", level: "b", goal: 1, weeks: [1] }],
    };

    const draft = buildDraft({ config: null, previous, vendors }, 4);

    expect(draft).toMatchObject({ source: "previous", sourceMonth: "2026-10", superPercent: 125, farmGoal: 4000 });
    expect(draft.people.find((person) => person.vendorId === "v2").level).toBe("b");
    expect(draft.people.every((person) => person.manualGoal === null)).toBe(true);
    expect(computeDraft(draft, 4).canSave).toBe(true);
  });
});
