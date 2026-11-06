import { describe, expect, it } from "vitest";

import { buildVendorProfile, salesStreak } from "./vendorProfile";

const ana = { _id: "v1", vendorName: "Ana", job: "B2B Sales", imageUrl: "ana.png" };
const bia = { _id: "v2", vendorName: "Bia", job: "B2G Sales" };

const sale = (day, overrides = {}) => ({
  _id: `${day}-${overrides.value ?? 1000}-${overrides.dealStatus ?? "ativa"}`,
  rdDealName: `Negócio ${day}`,
  dealStatus: "ativa",
  funnelType: "sales",
  segment: "b2b",
  value: 1000,
  vendorId: ana,
  sdrIds: [],
  realizedAt: `${day}T15:00:00.000Z`,
  ...overrides,
});

const now = new Date("2026-10-22T15:00:00.000Z");

describe("vendorProfile", () => {
  it("sequência de dias seguidos vendendo, contando a partir de hoje ou de ontem", () => {
    const days = ["2026-10-19", "2026-10-20", "2026-10-21"].map((day) => sale(day));

    expect(salesStreak(days, "2026-10-21")).toBe(3);
    expect(salesStreak(days, "2026-10-22")).toBe(3);
    expect(salesStreak(days, "2026-10-23")).toBe(0);
    expect(salesStreak([], "2026-10-22")).toBe(0);
  });

  it("monta o perfil: totais, posição, semanas, sequência, evolução e últimas vendas", () => {
    const sales = [
      sale("2026-10-13", { value: 4000 }),
      sale("2026-10-21", { value: 2000, funnelType: "farm" }),
      sale("2026-10-22", { value: 3000 }),
      sale("2026-10-22", { value: 9000, dealStatus: "cancelada" }),
      sale("2026-10-20", { value: 20000, vendorId: bia }),
    ];

    const profile = buildVendorProfile(sales, "v1", now);

    expect(profile).toMatchObject({
      vendor: ana,
      total: 9000,
      count: 3,
      average: 3000,
      newSales: 7000,
      renewals: 2000,
      cancelled: 1,
      position: 2,
      vendorsCount: 2,
      thisWeek: 5000,
      lastWeek: 4000,
      streak: 2,
    });
    expect(profile.evolution.days[0]).toBe("2026-10-13");
    expect(profile.evolution.values.at(-1)).toBe(9000);
    expect(profile.recentSales.map((item) => item.value)).toEqual([3000, 9000, 2000, 4000]);
  });

  it("vendedor sem vendas", () => {
    expect(buildVendorProfile([], "v9", now)).toMatchObject({ vendor: null, total: 0, count: 0, position: null });
  });
});
