import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminSales, getRankSdrs } from "../../api/slidesApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import SdrRankWidget from "./SdrRankWidget";

vi.mock("../../api/slidesApi", () => ({
  getRankSdrs: vi.fn(),
  getAdminSales: vi.fn(),
  getVendors: vi.fn(),
}));

const salesFor = (segment) => [
  {
    _id: "a",
    dealStatus: "ativa",
    funnelType: "sales",
    segment,
    value: 1000,
    realizedAt: "2026-10-20T15:00:00.000Z",
    vendorId: { _id: "v9", vendorName: "Zeca", job: "B2G Sales" },
    sdrIds: [{ _id: "s9", name: "Paula", job: "SDR" }],
  },
  {
    _id: "b",
    dealStatus: "ativa",
    funnelType: "farm",
    segment,
    value: 500,
    realizedAt: "2026-10-20T16:00:00.000Z",
    vendorId: { _id: "v8", vendorName: "Yara", job: "B2G Farmer" },
    sdrIds: [],
  },
];

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

  it("com um setor, conta as passagens só das vendas daquele setor", async () => {
    getAdminSales.mockResolvedValue({
      sales: [
        ...salesFor("b2b"),
        { ...salesFor("b2g")[0], _id: "c", sdrIds: [{ _id: "s8", name: "Otto", job: "CS" }] },
      ],
      total: 3,
    });

    renderWithQuery(<SdrRankWidget segment="B2B" />);

    const items = within(await screen.findByRole("list")).getAllByRole("listitem");
    expect(getRankSdrs).not.toHaveBeenCalled();
    expect(items.map((item) => item.textContent)).toEqual(["1ºPaulaSDR1 ponto"]);
  });
});
