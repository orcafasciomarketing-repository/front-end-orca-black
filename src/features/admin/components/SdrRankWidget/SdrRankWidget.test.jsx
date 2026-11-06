import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRankSdrs } from "../../api/slidesApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import SdrRankWidget from "./SdrRankWidget";

vi.mock("../../api/slidesApi", () => ({
  getRankSdrs: vi.fn(),
  getAdminSales: vi.fn(),
  getVendors: vi.fn(),
}));

describe("SdrRankWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra o ranking de passagens vindo do backend", async () => {
    getRankSdrs.mockResolvedValue([
      { sdrId: "s1", name: "Juliana", job: "SDR", points: 6 },
      { sdrId: "s2", name: "Rafael", job: "Suporte", points: 2 },
    ]);

    renderWithQuery(<SdrRankWidget />);

    const items = within(await screen.findByRole("list")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("1ºJulianaSDR6 pontos");
    expect(items[1]).toHaveTextContent("2ºRafaelSuporte2 pontos");
  });

  it("avisa quando ninguém fez passagem ainda", async () => {
    getRankSdrs.mockResolvedValue([]);

    renderWithQuery(<SdrRankWidget />);

    expect(await screen.findByText("Nenhuma passagem ainda")).toBeInTheDocument();
  });

  it("com um setor, pede o ranking do setor ao backend", async () => {
    getRankSdrs.mockResolvedValue([{ sdrId: "s9", name: "Paula", job: "B2B SDR", points: 1 }]);

    renderWithQuery(<SdrRankWidget segment="B2B" />);

    const items = within(await screen.findByRole("list")).getAllByRole("listitem");
    expect(getRankSdrs).toHaveBeenCalledWith({ period: "all", segment: "B2B" });
    expect(items.map((item) => item.textContent)).toEqual(["1ºPaulaB2B SDR1 ponto"]);
  });

  it("esta semana mostra o movimento em relação à semana passada", async () => {
    getRankSdrs.mockImplementation(async (options) => {
      if (options?.period === "week") return [{ sdrId: "s1", name: "Juliana", job: "SDR", points: 3 }];
      if (options?.period === "lastWeek") return [{ sdrId: "s1", name: "Juliana", job: "SDR", points: 2 }];
      return [];
    });
    renderWithQuery(<SdrRankWidget />);

    fireEvent.click(screen.getByRole("button", { name: "Esta semana" }));

    expect(await screen.findByText("mesma posição da semana passada")).toBeInTheDocument();
  });
});
