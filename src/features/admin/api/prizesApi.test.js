import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "../../../shared/apiClient.js";
import { createPrizeWithdrawal, deletePrizeWithdrawal, getPrizes, getPrizeWithdrawals } from "./prizesApi";

vi.mock("../../../shared/apiClient.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

describe("prizesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_USE_MOCKS", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("pede o saldo e o histórico com o setor em minúsculas", async () => {
    api.get.mockResolvedValue({ data: { data: { people: [] } } });

    await getPrizes("B2G");
    await getPrizeWithdrawals("");

    expect(api.get).toHaveBeenCalledWith("/prizes", { params: { segment: "b2g" } });
    expect(api.get).toHaveBeenCalledWith("/prizes/withdrawals", { params: {} });
  });

  it("registra e exclui retiradas", async () => {
    api.post.mockResolvedValue({ data: { data: { _id: "w1" } } });
    const withdrawal = { personId: "p1", kind: "vendor", quantity: 1, prize: "Caneca", withdrawnAt: "2026-11-09" };

    await expect(createPrizeWithdrawal(withdrawal)).resolves.toEqual({ _id: "w1" });
    await deletePrizeWithdrawal("w1");

    expect(api.post).toHaveBeenCalledWith("/prizes/withdrawals", withdrawal);
    expect(api.delete).toHaveBeenCalledWith("/prizes/withdrawals/w1");
  });

  it("com VITE_USE_MOCKS=true mostra os dados de demonstração e não deixa registrar", async () => {
    vi.stubEnv("VITE_USE_MOCKS", "true");

    const prizes = await getPrizes("");
    expect(api.get).not.toHaveBeenCalled();
    expect(prizes.step).toBe(10);
    expect(prizes.people.length).toBeGreaterThan(0);
    expect(prizes.people.every((person) => person.balance === person.earned - person.withdrawn)).toBe(true);

    const b2g = await getPrizes("B2G");
    expect(b2g.people.every((person) => person.job.startsWith("B2G"))).toBe(true);

    const withdrawals = await getPrizeWithdrawals("");
    expect(withdrawals[0]).toMatchObject({ name: "Brenda Lima", prize: "Caneca personalizada" });

    await expect(createPrizeWithdrawal({})).rejects.toThrow("não funciona com os dados de demonstração");
  });
});
