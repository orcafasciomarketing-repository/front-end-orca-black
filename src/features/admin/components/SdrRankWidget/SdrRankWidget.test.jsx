import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRankSdrs } from "../../api/slidesApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import SdrRankWidget from "./SdrRankWidget";

vi.mock("../../api/slidesApi", () => ({
  getRankSdrs: vi.fn(),
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
});
