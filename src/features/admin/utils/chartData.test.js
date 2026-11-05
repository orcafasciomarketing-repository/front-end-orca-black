import { describe, expect, it } from "vitest";

import {
  buildSalesCharts,
  cumulativeByDay,
  cumulativeByDayAndGroup,
  dailyByFunnel,
  formatDay,
  listDays,
  passagesByPerson,
  segmentOf,
  totalsByTeam,
  totalsByVendor,
} from "./chartData";

const now = new Date("2026-10-22T15:00:00.000Z");

const bruno = { _id: "v1", vendorName: "Bruno", teamId: "t1" };
const carla = { _id: "v2", vendorName: "Carla", teamId: "t2" };

const makeSale = (overrides) => ({
  dealStatus: "ativa",
  funnelType: "sales",
  segment: "b2b",
  value: 1000,
  vendorId: bruno,
  sdrIds: [],
  realizedAt: "2026-10-20T15:00:00.000Z",
  ...overrides,
});

describe("chartData", () => {
  it("listDays vai da primeira venda até hoje, sem semana", () => {
    const sales = [makeSale({ realizedAt: "2026-10-19T15:00:00.000Z" }), makeSale({ realizedAt: "2026-10-21T15:00:00.000Z" })];

    expect(listDays(sales, "", now)).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"]);
  });

  it("listDays com semana vai de segunda até hoje na semana atual, e até domingo nas passadas", () => {
    expect(listDays([], "2026-10-19", now)).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"]);
    expect(listDays([], "2026-10-12", now)).toHaveLength(7);
    expect(listDays([], "2026-10-12", now).at(-1)).toBe("2026-10-18");
  });

  it("listDays sem vendas e sem semana não tem dias", () => {
    expect(listDays([], "", now)).toEqual([]);
  });

  it("conta o dia pelo horário de São Paulo", () => {
    const lateNight = makeSale({ realizedAt: "2026-10-21T02:00:00.000Z", value: 500 });

    expect(cumulativeByDay([lateNight], ["2026-10-20", "2026-10-21"])).toEqual([500, 500]);
  });

  it("cumulativeByDay soma dia a dia, inclusive nos dias sem venda", () => {
    const sales = [
      makeSale({ realizedAt: "2026-10-19T15:00:00.000Z", value: 100 }),
      makeSale({ realizedAt: "2026-10-21T15:00:00.000Z", value: 50 }),
      makeSale({ realizedAt: "2026-10-21T18:00:00.000Z", value: 25 }),
    ];

    expect(cumulativeByDay(sales, ["2026-10-19", "2026-10-20", "2026-10-21"])).toEqual([100, 100, 175]);
  });

  it("cumulativeByDayAndGroup separa por segmento, em ordem alfabética", () => {
    const sales = [
      makeSale({ segment: "b2g", value: 300 }),
      makeSale({ segment: "b2b", value: 100 }),
      makeSale({ segment: undefined, value: 1 }),
    ];

    expect(cumulativeByDayAndGroup(sales, ["2026-10-20"], segmentOf)).toEqual([
      { key: "B2B", label: "B2B", values: [100] },
      { key: "B2G", label: "B2G", values: [300] },
      { key: "Sem setor", label: "Sem setor", values: [1] },
    ]);
  });

  it("dailyByFunnel separa vendas e renovações por dia, sem acumular", () => {
    const sales = [
      makeSale({ realizedAt: "2026-10-19T15:00:00.000Z", value: 100 }),
      makeSale({ realizedAt: "2026-10-20T15:00:00.000Z", value: 40, funnelType: "farm" }),
    ];

    expect(dailyByFunnel(sales, ["2026-10-19", "2026-10-20"])).toEqual({ sales: [100, 0], renewals: [0, 40] });
  });

  it("totalsByVendor soma por vendedor, do maior para o menor", () => {
    const sales = [makeSale({ value: 100 }), makeSale({ value: 300, vendorId: carla }), makeSale({ value: 50 })];

    expect(totalsByVendor(sales)).toEqual([
      { key: "v2", label: "Carla", value: 300 },
      { key: "v1", label: "Bruno", value: 150 },
    ]);
  });

  it("totalsByTeam mostra todas as equipes, mesmo sem venda, e junta vendedor sem equipe em 'Sem equipe'", () => {
    const teams = [
      { teamId: "t1", teamName: "Wizards" },
      { teamId: "t2", teamName: "Orçawinx" },
      { teamId: "t3", teamName: "Sem freio" },
    ];
    const sales = [
      makeSale({ value: 100 }),
      makeSale({ value: 300, vendorId: carla }),
      makeSale({ value: 7, vendorId: { _id: "v9", vendorName: "Ana" } }),
    ];

    expect(totalsByTeam(sales, teams)).toEqual([
      { key: "t2", label: "Orçawinx", value: 300 },
      { key: "t1", label: "Wizards", value: 100 },
      { key: "Sem equipe", label: "Sem equipe", value: 7 },
      { key: "t3", label: "Sem freio", value: 0 },
    ]);
  });

  it("passagesByPerson conta uma passagem por pessoa, com o cargo", () => {
    const izabel = { _id: "s1", name: "Izabel", job: "SDR" };
    const caio = { _id: "s2", name: "Caio", job: "CS" };
    const sales = [makeSale({ sdrIds: [izabel, caio] }), makeSale({ sdrIds: [izabel] }), makeSale({ sdrId: caio, sdrIds: undefined })];

    expect(passagesByPerson(sales)).toEqual([
      { key: "s2", label: "Caio", detail: "CS", value: 2 },
      { key: "s1", label: "Izabel", detail: "SDR", value: 2 },
    ]);
  });

  it("buildSalesCharts ignora canceladas e aplica a semana, mas a campanha usa todas as semanas", () => {
    const sales = [
      makeSale({ realizedAt: "2026-10-14T15:00:00.000Z", value: 100 }),
      makeSale({ realizedAt: "2026-10-20T15:00:00.000Z", value: 200 }),
      makeSale({ realizedAt: "2026-10-21T15:00:00.000Z", value: 999, dealStatus: "cancelada" }),
    ];

    const charts = buildSalesCharts(sales, "2026-10-19", now);

    expect(charts.activeSales).toHaveLength(1);
    expect(charts.days).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"]);
    expect(charts.total).toEqual([0, 200, 200, 200]);
    expect(charts.campaign.days[0]).toBe("2026-10-14");
    expect(charts.campaign.total.at(-1)).toBe(300);
  });

  it("formatDay mostra dia/mês", () => {
    expect(formatDay("2026-10-05")).toBe("05/10");
  });
});
