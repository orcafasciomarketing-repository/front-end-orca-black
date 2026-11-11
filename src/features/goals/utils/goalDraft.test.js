import { describe, expect, it } from "vitest";

import { buildDraft, computeDraft, levelsOfType, newLevel, toPayload } from "./goalDraft";
import { dynamicWeekTiers, monthWeeks, paceOf, peopleTiers, segmentTiers, tierProgress, typeTiers } from "./goalMath";

const vendors = [
  { vendorId: "v1", name: "Ana", job: "B2B Venda", type: "sales" },
  { vendorId: "v2", name: "Bia", job: "B2B Venda", type: "sales" },
  { vendorId: "v3", name: "Caio", job: "B2B Farmer", type: "farm" },
];

const VALUES = {
  sales: { junior: [3000, 3600], pleno: [4000, 4800], senior: [5000, 6000] },
  farm: { junior: [2000, 2500], pleno: [3000, 3600], senior: [4000, 4400] },
};

const filledDraft = (changes = {}) => {
  const draft = buildDraft({ config: null, previous: null, vendors });
  return {
    ...draft,
    levels: draft.levels.map((level) => ({
      ...level,
      goal: VALUES[level.type][level.key][0],
      superGoal: VALUES[level.type][level.key][1],
    })),
    people: draft.people.map((person) => (person.vendorId === "v2" ? { ...person, level: "pleno" } : person)),
    ...changes,
  };
};

const BLACK = { active: true, sectorGoal: 15000 };

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

  it("Super da parte: a soma das pessoas (farmSuper/salesSuper) ou, no modelo antigo, Meta × %", () => {
    const byType = typeTiers(
      { farmGoal: 3000, salesGoal: 7000, farmSuper: 3300, salesSuper: 9000, farmBlack: 4500, salesBlack: 10500 },
      true,
    );
    expect(byType).toEqual({
      farm: { goal: 3000, super: 3300, black: 4500 },
      sales: { goal: 7000, super: 9000, black: 10500 },
    });
    expect(segmentTiers(byType)).toEqual({ goal: 10000, super: 12300, black: 15000 });
    expect(typeTiers({ farmGoal: 3000, salesGoal: 7000, superPercent: 120 }).sales.super).toBe(8400);
  });

  it("Black desce para as pessoas na proporção da Meta", () => {
    const people = [
      { vendorId: "jr", type: "sales", goal: 1000, superGoal: 1500 },
      { vendorId: "sr", type: "sales", goal: 2000, superGoal: 3000 },
    ];
    const byPerson = peopleTiers(people, {
      sales: { goal: 3000, super: 4500, black: 9000 },
      farm: { goal: 0, super: 0, black: 0 },
    });
    expect(byPerson.get("sr")).toEqual({ goal: 2000, super: 3000, black: 6000 });
  });

  it("semana recalculada: o que falta para o mês ÷ semanas que faltam; semana futura usa o vendido até hoje", () => {
    const weeks = monthWeeks("2026-11");
    const days = weeks.flatMap((week) => Array.from({ length: 7 }, (_, i) => addDay(week.start, i)));
    const daily = days.map((day) => (day === "2026-11-03" ? 100000 : day === "2026-11-10" ? 50000 : 0));
    const tiers = dynamicWeekTiers({
      personTiers: { goal: 5000, super: 6000, black: 0 },
      daily,
      days,
      weeks,
      today: "2026-11-11",
    });
    expect(tiers[0]).toEqual({ goal: 1000, super: 1200, black: 0 });
    expect(tiers[1]).toEqual({ goal: 1000, super: 1250, black: 0 });
    expect(tiers[2]).toEqual({ goal: 1166.67, super: 1500, black: 0 });
  });

  it("sem Meta black, bateu a Super o resto é excedente; a faixa atual sobe de Meta para Super e Black", () => {
    expect(tierProgress(1300, { goal: 1000, super: 1200, black: 0 })).toMatchObject({
      available: ["goal", "super"],
      current: "super",
      excess: 100,
    });
    const tiers = { goal: 1000, super: 1200, black: 1500 };
    expect(tierProgress(1000, tiers).current).toBe("super");
    expect(tierProgress(1800, tiers)).toMatchObject({ current: "black", excess: 300, percent: 120 });
  });

  it("ritmo em dias úteis (segunda a sexta, sem feriado), com hoje nos dias que faltam", () => {
    const base = { goal: 700, start: "2026-11-02", end: "2026-11-08", today: "2026-11-05" };
    const behind = paceOf({ ...base, realized: 100 });
    expect([behind.totalDays, behind.elapsedDays, behind.daysToGo]).toEqual([4, 3, 2]);
    expect(behind.status).toBe("behind");
    expect(behind.neededPerDay).toBe(300);
    expect(paceOf({ ...base, realized: 600 }).status).toBe("ahead");
    expect(paceOf({ ...base, realized: 700 }).status).toBe("done");
  });
});

function addDay(day, amount) {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + amount * 86400000).toISOString().slice(0, 10);
}

describe("goalDraft (rascunho da tela de cadastro)", () => {
  it("mês novo: níveis Júnior, Pleno e Sênior para Farmer e para Venda, em branco, e ticket de R$ 2.000", () => {
    const draft = buildDraft({ config: null, previous: null, vendors });
    expect(levelsOfType(draft.levels, "farm").map((level) => level.name)).toEqual(["Júnior", "Pleno", "Sênior"]);
    expect(levelsOfType(draft.levels, "sales").map((level) => level.key)).toEqual(["junior", "pleno", "senior"]);
    expect(draft.tickets).toEqual({ farm: 2000, sales: 2000 });
    expect(draft.conversion).toEqual({ farm: "", sales: 30 });
    expect(draft.people.map((person) => person.level)).toEqual(["junior", "junior", "junior"]);
    expect(computeDraft(draft).canSave).toBe(false);
  });

  it("cada pessoa recebe a Meta e a Super do nível dela; o setor é a soma", () => {
    const computed = computeDraft(filledDraft());
    expect(computed.people.map((person) => person.tiers)).toEqual([
      { goal: 3000, super: 3600, black: 0 },
      { goal: 4000, super: 4800, black: 0 },
      { goal: 2000, super: 2500, black: 0 },
    ]);
    expect(computed.byType.sales).toEqual({ goal: 7000, super: 8400, black: 0 });
    expect(computed.tiers).toEqual({ goal: 9000, super: 10900, black: 0 });
    expect(computed.canSave).toBe(true);
  });

  it("Meta e Super ajustadas à mão valem só para a pessoa; Super menor que a Meta trava o salvar", () => {
    const draft = filledDraft();
    const adjusted = {
      ...draft,
      people: draft.people.map((person) =>
        person.vendorId === "v1" ? { ...person, manualGoal: 3500, manualSuper: 3400 } : person,
      ),
    };
    const computed = computeDraft(adjusted);
    expect(computed.people[0].tiers).toMatchObject({ goal: 3500, super: 3400 });
    expect(computed.people[0].superOk).toBe(false);
    expect(computed.canSave).toBe(false);
  });

  it("nível com problema trava o salvar: sem nome, Super menor que a Meta ou origens passando de 100%", () => {
    const draft = filledDraft();
    const withProblems = {
      ...draft,
      levels: draft.levels.map((level, index) =>
        index === 0 ? { ...level, name: " ", superGoal: 100, anticipation: 60, upsell: 30, churn: 20 } : level,
      ),
    };
    const computed = computeDraft(withProblems);
    expect(computed.levels[0].problems).toEqual(["name", "super", "origins"]);
    expect(computed.levelsOk).toBe(false);
    expect(computed.canSave).toBe(false);
  });

  it("mês com Meta black: Farmer é o que o gestor digita, Venda o resto; cada pessoa na proporção da Meta", () => {
    const computed = computeDraft(filledDraft({ farmBlack: 4000 }), BLACK);
    expect(computed.byType.farm.black).toBe(4000);
    expect(computed.byType.sales.black).toBe(11000);
    expect(computed.people.map((person) => person.tiers.black)).toEqual([4714.29, 6285.71, 4000]);
    expect(computed.canSave).toBe(true);

    const tooHigh = computeDraft(filledDraft({ farmBlack: 16000 }), BLACK);
    expect(tooHigh.sectorBlackOk).toBe(false);
    const belowSuper = computeDraft(filledDraft({ farmBlack: 2000 }), BLACK);
    expect(belowSuper.blackOk.farm).toBe(false);
    expect(belowSuper.canSave).toBe(false);
  });

  it("Black editada à mão: o resto vai para os outros; Black menor que a Super da pessoa trava", () => {
    const draft = filledDraft({ farmBlack: 4000 });
    const edited = {
      ...draft,
      people: draft.people.map((person) => (person.vendorId === "v1" ? { ...person, manualBlack: 5000 } : person)),
    };
    const computed = computeDraft(edited, BLACK);
    expect(computed.people.map((person) => person.tiers.black)).toEqual([5000, 6000, 4000]);
    expect(computed.blackTiersOk).toEqual({ farm: true, sales: true });

    const low = computeDraft(
      {
        ...draft,
        people: draft.people.map((person) => (person.vendorId === "v1" ? { ...person, manualBlack: 1000 } : person)),
      },
      BLACK,
    );
    expect(low.people[0].blackOk).toBe(false);
    expect(low.canSave).toBe(false);
  });

  it("envio: níveis com Meta, Super e origens, tickets e a Meta e a Super finais de cada pessoa; quem fica sem meta não vai", () => {
    const draft = filledDraft({ tickets: { farm: 2000, sales: "" } });
    const withoutBia = {
      ...draft,
      people: draft.people.map((person) => (person.vendorId === "v2" ? { ...person, included: false } : person)),
    };
    const payload = toPayload(withoutBia, computeDraft(withoutBia));
    expect(payload.levels[0]).toEqual({
      key: "junior",
      name: "Júnior",
      type: "farm",
      goal: 2000,
      superGoal: 2500,
      anticipation: 0,
      upsell: 0,
      churn: 0,
    });
    expect(payload.tickets).toEqual({ farm: 2000, sales: null });
    expect(payload.conversion).toEqual({ farm: null, sales: 30 });
    expect(payload.farmBlack).toBeNull();
    expect(payload.people).toEqual([
      { vendorId: "v1", level: "junior", goal: 3000, superGoal: 3600, blackGoal: null },
      { vendorId: "v3", level: "junior", goal: 2000, superGoal: 2500, blackGoal: null },
    ]);
  });

  it("mês salvo volta exatamente como foi salvo, inclusive os ajustes à mão", () => {
    const draft = filledDraft({ farmBlack: 4000 });
    const adjusted = {
      ...draft,
      people: draft.people.map((person) =>
        person.vendorId === "v1" ? { ...person, manualGoal: 3500, manualSuper: 4000, manualBlack: 5000 } : person,
      ),
    };
    const payload = toPayload(adjusted, computeDraft(adjusted, BLACK), BLACK);
    const config = {
      month: "2026-11",
      model: "levels",
      ...payload,
      people: payload.people.map((person) => ({
        ...person,
        type: vendors.find((v) => v.vendorId === person.vendorId).type,
      })),
    };

    const reopened = buildDraft({ config, previous: null, vendors }, BLACK);
    expect(reopened.source).toBe("saved");
    expect(reopened.legacy).toBe(false);
    expect(reopened.people[0]).toMatchObject({ manualGoal: 3500, manualSuper: 4000, manualBlack: 5000 });
    expect(reopened.people[1]).toMatchObject({ manualGoal: null, manualSuper: null });
    expect(toPayload(reopened, computeDraft(reopened, BLACK), BLACK)).toEqual(payload);
  });

  it("mês salvo no modelo antigo: os níveis vêm das metas salvas e cada pessoa continua com a mesma Meta e Super", () => {
    const legacy = {
      month: "2026-11",
      model: "weights",
      superPercent: 120,
      farmBlack: null,
      levels: [
        { key: "jr", name: "Júnior", weight: 1 },
        { key: "sr", name: "Sênior", weight: 2 },
      ],
      people: [
        { vendorId: "v1", type: "sales", level: "jr", goal: 3000, superGoal: 3600, blackGoal: null, weeks: [] },
        { vendorId: "v2", type: "sales", level: "jr", goal: 3200, superGoal: 3840, blackGoal: null, weeks: [] },
        { vendorId: "v3", type: "farm", level: "sr", goal: 6000, superGoal: null, blackGoal: null, weeks: [] },
      ],
    };
    const draft = buildDraft({ config: legacy, previous: null, vendors });
    expect(draft.legacy).toBe(true);
    expect(levelsOfType(draft.levels, "sales").map((level) => [level.key, level.goal, level.superGoal])).toEqual([
      ["jr", 3000, 3600],
      ["sr", 0, 0],
    ]);
    expect(levelsOfType(draft.levels, "farm").find((level) => level.key === "sr")).toMatchObject({
      goal: 6000,
      superGoal: 7200,
    });
    const computed = computeDraft(draft);
    expect(computed.people.map((person) => person.tiers.goal)).toEqual([3000, 3200, 6000]);
    expect(computed.people[1]).toMatchObject({ manualGoal: 3200, manualSuper: 3840 });
  });

  it("mês novo copia do anterior os níveis, os tickets e o nível de cada pessoa, sem ajustes à mão", () => {
    const draft = filledDraft();
    const payload = toPayload(draft, computeDraft(draft));
    const previous = {
      month: "2026-10",
      model: "levels",
      ...payload,
      tickets: { farm: 1500, sales: 2500 },
      people: payload.people.map((person) => ({ ...person, goal: person.goal + 1, type: "sales" })),
    };
    const copied = buildDraft({ config: null, previous, vendors });
    expect(copied.source).toBe("previous");
    expect(copied.tickets).toEqual({ farm: 1500, sales: 2500 });
    expect(copied.people.map((person) => [person.level, person.manualGoal])).toEqual([
      ["junior", null],
      ["pleno", null],
      ["junior", null],
    ]);
  });

  it("conversão de leads: vazia ou de 1 a 100%; fora disso trava o salvar", () => {
    expect(computeDraft(filledDraft({ conversion: { farm: "", sales: 30 } })).canSave).toBe(true);
    const invalid = computeDraft(filledDraft({ conversion: { farm: "", sales: 150 } }));
    expect(invalid.conversionOk).toEqual({ farm: true, sales: false });
    expect(invalid.canSave).toBe(false);
    expect(computeDraft(filledDraft({ conversion: { farm: 0, sales: 30 } })).conversionOk.farm).toBe(false);
  });

  it("nível novo ganha uma chave que não repete no tipo", () => {
    const draft = buildDraft({ config: null, previous: null, vendors });
    expect(newLevel(draft.levels, "farm")).toMatchObject({ key: "nivel-4", type: "farm", name: "" });
  });
});
