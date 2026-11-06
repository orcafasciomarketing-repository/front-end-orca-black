import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "../../../shared/apiClient.js";
import { getForecast } from "./forecastApi";

vi.mock("../../../shared/apiClient.js", () => ({
  default: { get: vi.fn() },
}));

describe("forecastApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_USE_MOCKS", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("pede o setor em minúsculas", async () => {
    api.get.mockResolvedValue({ data: { data: { segment: "b2g" } } });

    await expect(getForecast("B2G")).resolves.toEqual({ segment: "b2g" });
    expect(api.get).toHaveBeenCalledWith("/analytics/forecast", { params: { segment: "b2g" } });
  });

  it("sem setor (Todos) não manda o parâmetro", async () => {
    api.get.mockResolvedValue({ data: { data: { segment: null } } });

    await getForecast("");

    expect(api.get).toHaveBeenCalledWith("/analytics/forecast", { params: {} });
  });

  it("com VITE_USE_MOCKS=true usa os dados de demonstração, com a meta do setor", async () => {
    vi.stubEnv("VITE_USE_MOCKS", "true");

    const forecast = await getForecast("B2B");

    expect(api.get).not.toHaveBeenCalled();
    expect(forecast.segment).toBe("b2b");
    expect(forecast.goal).toBe(2000000);
    expect(Object.keys(forecast.campaign.scenarios)).toEqual(["pessimistic", "realistic", "optimistic"]);
  });
});
