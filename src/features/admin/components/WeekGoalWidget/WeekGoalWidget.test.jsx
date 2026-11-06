import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getForecast } from "../../api/forecastApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import WeekGoalWidget from "./WeekGoalWidget";

vi.mock("../../api/forecastApi", () => ({
  getForecast: vi.fn(),
}));

const forecast = (weekGoal, overrides = {}) => ({
  segment: null,
  goalIsTotal: true,
  week: {
    start: "2026-11-09",
    end: "2026-11-14",
    sold: 5000,
    remainingDays: 3,
    scenarios: { pessimistic: 9000, realistic: 10000, optimistic: 11000 },
  },
  weekGoal,
  ...overrides,
});

const text = () => screen.getByRole("region", { name: "Meta da semana" }).textContent.replace(/ /g, " ");

describe("WeekGoalWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra vendido, meta, percentual, quanto falta, ritmo e o cenário da semana", async () => {
    getForecast.mockResolvedValue(
      forecast({ goal: 60000, sold: 5000, percent: 8.33, remaining: 55000, productiveDays: 6, requiredPace: 18333.33 }),
    );

    renderWithQuery(<WeekGoalWidget />);

    const bar = await screen.findByRole("progressbar", { name: "Progresso da meta da semana" });
    expect(bar).toHaveAttribute("aria-valuenow", "8.33");
    expect(text()).toContain("09/11 a 14/11");
    expect(text()).toContain("R$ 5.000,00de R$ 60.000,008,3%");
    expect(text()).toContain("Falta na semanaR$ 55.000,00");
    expect(text()).toContain("Ritmo necessárioR$ 18.333,33/dia");
    expect(text()).toContain("Cenário realista da semanaR$ 10.000,00");
    expect(text()).toContain("Dias produtivos restantes3");
  });

  it("com setor, pede o forecast do setor e mostra o setor quando a meta é dele", async () => {
    getForecast.mockResolvedValue(
      forecast(
        { goal: 30000, sold: 0, percent: 0, remaining: 30000, productiveDays: 6, requiredPace: 10000 },
        { segment: "b2b", goalIsTotal: false },
      ),
    );

    renderWithQuery(<WeekGoalWidget segment="B2B" />);

    await screen.findByRole("progressbar");
    expect(getForecast).toHaveBeenCalledWith("B2B");
    expect(text()).toContain("09/11 a 14/11 · B2B");
  });

  it("meta da semana batida e sem meta semanal fora da campanha", async () => {
    getForecast.mockResolvedValue(
      forecast({ goal: 10000, sold: 12000, percent: 120, remaining: 0, productiveDays: 6, requiredPace: 0 }),
    );
    const { unmount } = renderWithQuery(<WeekGoalWidget />);
    expect(await screen.findByText("Meta da semana batida!")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    unmount();

    getForecast.mockResolvedValue(forecast(null));
    renderWithQuery(<WeekGoalWidget segment="B2G" />);
    expect(await screen.findByText("Sem meta semanal fora da campanha")).toBeInTheDocument();
  });
});
