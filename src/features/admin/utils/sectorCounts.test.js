import { describe, expect, it } from "vitest";

import { countBySector } from "./sectorCounts";

const sdr = { name: "Izabel", job: "SDR" };
const cs = { name: "Caio", job: "CS" };
const support = { name: "Julia", job: "Suporte" };

const makeSale = (overrides) => ({
  dealStatus: "ativa",
  funnelType: "sales",
  segment: "b2b",
  sdrIds: [],
  ...overrides,
});

describe("countBySector", () => {
  it("conta vendas e renovações por segmento, em ordem alfabética", () => {
    const counts = countBySector([
      makeSale({ segment: "b2g" }),
      makeSale({ segment: "b2b" }),
      makeSale({ segment: "b2b" }),
      makeSale({ funnelType: "farm", segment: "b2b" }),
    ]);

    expect(counts.sales).toEqual([
      { sector: "B2B", count: 2 },
      { sector: "B2G", count: 1 },
    ]);
    expect(counts.renewals).toEqual([{ sector: "B2B", count: 1 }]);
  });

  it("conta uma passagem por pessoa, pelo cargo, em vendas e renovações", () => {
    const counts = countBySector([
      makeSale({ sdrIds: [sdr, support] }),
      makeSale({ funnelType: "farm", sdrIds: [cs] }),
      makeSale({ sdrIds: [sdr] }),
    ]);

    expect(counts.passages).toEqual([
      { sector: "CS", count: 1 },
      { sector: "SDR", count: 2 },
      { sector: "Suporte", count: 1 },
    ]);
  });

  it("ignora vendas canceladas", () => {
    const counts = countBySector([
      makeSale({ dealStatus: "cancelada", sdrIds: [sdr] }),
      makeSale({ dealStatus: "cancelada", funnelType: "farm" }),
    ]);

    expect(counts).toEqual({ sales: [], passages: [], renewals: [] });
  });

  it("aceita venda antiga com sdrId e agrupa sem segmento ou cargo em 'Sem setor'", () => {
    const counts = countBySector([makeSale({ segment: undefined, sdrIds: undefined, sdrId: { name: "Ana" } })]);

    expect(counts.sales).toEqual([{ sector: "Sem setor", count: 1 }]);
    expect(counts.passages).toEqual([{ sector: "Sem setor", count: 1 }]);
  });
});
