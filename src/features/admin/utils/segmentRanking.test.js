import { describe, expect, it } from "vitest";

import { rankSdrsFromSales, rankVendorsFromSales } from "./segmentRanking";
import { filterSalesBySegment } from "./segments";

const vendor = (id, name) => ({ _id: id, vendorName: name, job: "B2B Sales" });
const sdr = (id, name) => ({ _id: id, name, job: "SDR" });

const sale = (overrides) => ({
  dealStatus: "ativa",
  funnelType: "sales",
  segment: "b2b",
  value: 1000,
  realizedAt: "2026-10-20T15:00:00.000Z",
  vendorId: vendor("v1", "Ana"),
  sdrIds: [],
  ...overrides,
});

describe("segmentRanking", () => {
  it("filterSalesBySegment compara sem diferenciar maiúsculas e devolve tudo sem setor", () => {
    const sales = [sale({ segment: "b2b" }), sale({ segment: "B2G" }), sale({ segment: undefined })];

    expect(filterSalesBySegment(sales, "B2B")).toHaveLength(1);
    expect(filterSalesBySegment(sales, "B2G")).toHaveLength(1);
    expect(filterSalesBySegment(sales, "")).toHaveLength(3);
  });

  it("vendas valem 2 pontos, renovações 1, só ativas, e fica o top 3", () => {
    const sales = [
      sale({ vendorId: vendor("v1", "Ana") }),
      sale({ vendorId: vendor("v2", "Bia") }),
      sale({ vendorId: vendor("v2", "Bia") }),
      sale({ vendorId: vendor("v3", "Caio") }),
      sale({ vendorId: vendor("v4", "Duda") }),
      sale({ vendorId: vendor("v5", "Eva"), dealStatus: "cancelada" }),
      sale({ vendorId: vendor("v6", "Fábio"), funnelType: "farm" }),
    ];

    expect(rankVendorsFromSales(sales, "sales").map((item) => [item.name, item.points])).toEqual([
      ["Bia", 4],
      ["Ana", 2],
      ["Caio", 2],
    ]);
    expect(rankVendorsFromSales(sales, "farm")).toEqual([
      { vendorId: "v6", name: "Fábio", job: "B2B Sales", points: 1 },
    ]);
  });

  it("cada pessoa da passagem ganha 1 ponto por venda ativa", () => {
    const sales = [
      sale({ sdrIds: [sdr("s1", "Julia"), sdr("s2", "Lucas")] }),
      sale({ sdrIds: [sdr("s1", "Julia")], funnelType: "farm" }),
      sale({ sdrIds: [sdr("s2", "Lucas")], dealStatus: "cancelada" }),
    ];

    expect(rankSdrsFromSales(sales)).toEqual([
      { sdrId: "s1", name: "Julia", job: "SDR", points: 2 },
      { sdrId: "s2", name: "Lucas", job: "SDR", points: 1 },
    ]);
  });
});
