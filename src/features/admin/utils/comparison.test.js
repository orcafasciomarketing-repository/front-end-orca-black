import { describe, expect, it } from "vitest";

import { buildComparison, comparisonPresets, cumulativeByDayIndex, summarizeRange } from "./comparison";

const sale = (overrides) => ({
  dealStatus: "ativa",
  funnelType: "sales",
  segment: "b2b",
  value: 1000,
  realizedAt: "2026-10-21T15:00:00.000Z",
  sdrIds: [],
  ...overrides,
});

describe("comparison", () => {
  it("atalhos a partir de quarta, 21/10", () => {
    const presets = Object.fromEntries(comparisonPresets("2026-10-21").map((preset) => [preset.key, preset]));

    expect(presets.day).toMatchObject({
      a: { start: "2026-10-21", end: "2026-10-21" },
      b: { start: "2026-10-14", end: "2026-10-14" },
    });
    expect(presets.week).toMatchObject({
      a: { start: "2026-10-19", end: "2026-10-21" },
      b: { start: "2026-10-12", end: "2026-10-14" },
    });
    expect(presets["last-7"]).toMatchObject({
      a: { start: "2026-10-15", end: "2026-10-21" },
      b: { start: "2026-10-08", end: "2026-10-14" },
    });
    expect(presets.month).toMatchObject({
      a: { start: "2026-10-01", end: "2026-10-21" },
      b: { start: "2026-09-01", end: "2026-09-21" },
    });
  });

  it("o atalho do mês passado não passa do último dia do mês", () => {
    const month = comparisonPresets("2026-10-31").find((preset) => preset.key === "month");

    expect(month.b).toEqual({ start: "2026-09-01", end: "2026-09-30" });
  });

  it("resume o período: total, quantidade, ticket, vendas novas, renovações, setores e passagens", () => {
    const sales = [
      sale({ value: 3000, sdrIds: [{ _id: "s1" }, { _id: "s2" }] }),
      sale({ value: 1000, funnelType: "farm", segment: "b2g" }),
      sale({ value: 9999, realizedAt: "2026-10-22T15:00:00.000Z" }),
    ];

    expect(summarizeRange(sales, { start: "2026-10-21", end: "2026-10-21" })).toEqual({
      total: 4000,
      count: 2,
      average: 2000,
      newSales: 3000,
      renewals: 1000,
      b2b: 3000,
      b2g: 1000,
      passages: 2,
    });
  });

  it("acumulado por dia do período, parando no fim do período e em hoje", () => {
    const sales = [sale({ realizedAt: "2026-10-19T15:00:00.000Z" }), sale({ realizedAt: "2026-10-21T15:00:00.000Z" })];

    expect(cumulativeByDayIndex(sales, { start: "2026-10-19", end: "2026-10-21" }, 4, "2026-10-21")).toEqual([
      1000,
      1000,
      2000,
      null,
    ]);
    expect(cumulativeByDayIndex(sales, { start: "2026-10-20", end: "2026-10-23" }, 4, "2026-10-21")).toEqual([
      0,
      1000,
      null,
      null,
    ]);
  });

  it("buildComparison ignora canceladas e usa o tamanho do maior período", () => {
    const sales = [
      sale({}),
      sale({ dealStatus: "cancelada", value: 5000 }),
      sale({ realizedAt: "2026-10-14T15:00:00.000Z" }),
    ];
    const result = buildComparison(
      sales,
      { start: "2026-10-21", end: "2026-10-21" },
      { start: "2026-10-13", end: "2026-10-14" },
      "2026-10-21",
    );

    expect(result.a.total).toBe(1000);
    expect(result.b.total).toBe(1000);
    expect(result.length).toBe(2);
    expect(result.dailyA).toEqual([1000, null]);
    expect(result.dailyB).toEqual([0, 1000]);
  });
});
