import { describe, expect, it } from "vitest";

import { buildGoalAlerts } from "./goalAlerts";

const days = Array.from({ length: 10 }, (_, index) => `2026-11-${String(index + 2).padStart(2, "0")}`);

const person = (
  vendorId,
  {
    cumulative = new Array(10).fill(0),
    chance = 50,
    reached = [],
    current = "goal",
    target = 1000,
    remaining = 1000,
  } = {},
) => ({
  vendorId,
  name: vendorId,
  cumulative,
  forecast: { tiers: { goal: { probability: chance } } },
  month: { reached, current, target, remaining, available: ["goal", "super"] },
});

describe("buildGoalAlerts", () => {
  const progress = { days, today: "2026-11-09" };

  it("chance baixa da Meta, sem vendas há 5 dias ou mais e perto da próxima faixa", () => {
    const people = [
      person("baixa", { chance: 12.5, cumulative: [0, 100, 100, 100, 100, 100, 200, 200, 200, 200] }),
      person("parada", { cumulative: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100] }),
      person("nunca"),
      person("perto", {
        current: "super",
        reached: ["goal"],
        target: 1500,
        remaining: 100,
        chance: 100,
        cumulative: [0, 0, 0, 0, 0, 0, 1400, 1400, 1400, 1400],
      }),
    ];

    const alerts = buildGoalAlerts(people, progress);

    expect(alerts.lowChance.map((item) => item.person.vendorId)).toEqual(["baixa"]);
    expect(alerts.noSales.map((item) => [item.person.vendorId, item.days])).toEqual([
      ["nunca", null],
      ["parada", 7],
    ]);
    expect(alerts.nearTier.map((item) => [item.person.vendorId, item.tier, item.remaining])).toEqual([
      ["perto", "super", 100],
    ]);
  });

  it("só no mês em andamento", () => {
    expect(buildGoalAlerts([person("a")], { days, today: "2026-12-20" })).toBeNull();
    expect(buildGoalAlerts([person("a")], { days, today: "2026-10-01" })).toBeNull();
  });
});
