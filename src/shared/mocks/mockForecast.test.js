import { describe, expect, it } from "vitest";

import { buildForecast } from "./mockForecast";

// Mesmos casos do tests/forecastCalculator.test.js do backend: a cópia tem que dar os mesmos números
const sale = (day, value) => ({ value, realizedAt: new Date(`${day}T03:00:00.000Z`) });
const at = (day) => new Date(`${day}T18:00:00.000Z`);

describe("mockForecast (cópia do cálculo do backend)", () => {
  it("fórmulas do PDF com ritmo constante", () => {
    const { campaign } = buildForecast({
      sales: [sale("2026-11-03", 39248), sale("2026-11-04", 39248)],
      goal: 3000000,
      now: at("2026-11-04"),
    });

    expect(campaign.productiveDays).toEqual({ elapsed: 2, remaining: 22 });
    expect(campaign.scenarios).toEqual({
      pessimistic: 78496 + 39248 * 0.8 * 22,
      realistic: 78496 + 39248 * 22,
      optimistic: 78496 + 39248 * 1.2 * 22,
    });
    expect(campaign.requiredPace).toBe(132795.64);
    expect(campaign.paceCoverage).toBe(29.56);
  });

  it("ritmo ponderado: 7 dias 50%, 30 dias 30%, campanha 20%", () => {
    const days = ["03", "04", "05", "06", "07", "09", "10", "11", "12", "13", "14"].map((day) => `2026-11-${day}`);
    const { campaign } = buildForecast({
      sales: days.map((day, index) => sale(day, (index + 1) * 1000)),
      goal: 200000,
      now: at("2026-11-14"),
    });

    expect(campaign.pace).toMatchObject({ last7: 8000, last30: 6000, campaign: 6000, current: 7000 });
    expect(campaign.scenarios.realistic).toBe(66000 + 7000 * 13);
  });

  it("semana com o feriado de 20/11", () => {
    const { week } = buildForecast({ sales: [], goal: 1000, now: at("2026-11-18") });

    expect(week).toMatchObject({ start: "2026-11-16", end: "2026-11-21", remainingDays: 2 });
  });
});
