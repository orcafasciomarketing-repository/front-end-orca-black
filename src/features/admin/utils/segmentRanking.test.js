import { describe, expect, it } from "vitest";

import { passagePoints, rankSdrsFromSales, rankVendorsFromSales, salePoints } from "./segmentRanking";
import { filterSalesBySegment } from "./segments";

const vendor = (id, name) => ({ _id: id, vendorName: name, job: "B2B Sales" });
const sdr = (id, name, job = "B2G SDR") => ({ _id: id, name, job });

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

  it("pontos da venda seguem a tabela do backend: setor + tipo", () => {
    expect(salePoints(sale({ segment: "b2g", funnelType: "sales" }))).toBe(3);
    expect(salePoints(sale({ segment: "b2g", funnelType: "farm" }))).toBe(2);
    expect(salePoints(sale({ segment: "b2b", funnelType: "sales" }))).toBe(2);
    expect(salePoints(sale({ segment: "b2b", funnelType: "farm" }))).toBe(1);
    expect(salePoints(sale({ segment: null }))).toBe(0);
  });

  it("pontos da passagem seguem o cargo, ignorando acento, maiúscula e espaços", () => {
    expect(passagePoints(sdr("s", "A", "B2G SDR"))).toBe(2);
    expect(passagePoints(sdr("s", "A", "b2b  sdr"))).toBe(1);
    expect(passagePoints(sdr("s", "A", "CS"))).toBe(1);
    expect(passagePoints(sdr("s", "A", " Suporte "))).toBe(2);
    expect(passagePoints(sdr("s", "A", "Estagiário"))).toBe(0);
  });

  it("ranking de vendedores: só ativas, só o tipo da aba, top 3", () => {
    const sales = [
      sale({ vendorId: vendor("v1", "Ana") }),
      sale({ vendorId: vendor("v2", "Bia"), segment: "b2g" }),
      sale({ vendorId: vendor("v2", "Bia"), segment: "b2g" }),
      sale({ vendorId: vendor("v3", "Caio") }),
      sale({ vendorId: vendor("v4", "Duda"), segment: "b2g" }),
      sale({ vendorId: vendor("v5", "Eva"), dealStatus: "cancelada", segment: "b2g" }),
      sale({ vendorId: vendor("v6", "Fábio"), funnelType: "farm" }),
    ];

    expect(rankVendorsFromSales(sales, "sales").map((item) => [item.name, item.points])).toEqual([
      ["Bia", 6],
      ["Duda", 3],
      ["Ana", 2],
    ]);
    expect(rankVendorsFromSales(sales, "farm")).toEqual([
      { vendorId: "v6", name: "Fábio", job: "B2B Sales", points: 1 },
    ]);
  });

  it("ranking de passagens: cada pessoa ganha os pontos do cargo dela por venda ativa", () => {
    const sales = [
      sale({ sdrIds: [sdr("s1", "Julia", "Suporte"), sdr("s2", "Lucas", "CS")] }),
      sale({ sdrIds: [sdr("s1", "Julia", "Suporte")], funnelType: "farm" }),
      sale({ sdrIds: [sdr("s2", "Lucas", "CS")], dealStatus: "cancelada" }),
    ];

    expect(rankSdrsFromSales(sales)).toEqual([
      { sdrId: "s1", name: "Julia", job: "Suporte", points: 4 },
      { sdrId: "s2", name: "Lucas", job: "CS", points: 1 },
    ]);
  });
});
