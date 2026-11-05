import { describe, expect, it } from "vitest";

import {
  buildKpis,
  cancellationSummary,
  concentration,
  forecast,
  goalTrack,
  calendarRange,
  salesCalendar,
  segmentShare,
  ticketBySegment,
  ticketByVendor,
  variation,
  weeklyTotals,
} from "./salesInsights";
import { resolvePeriod } from "./periods";

const vendor = (id, name) => ({ _id: id, vendorName: name });

const sale = (overrides) => ({
  dealStatus: "ativa",
  funnelType: "sales",
  segment: "b2b",
  value: 1000,
  vendorId: vendor("v1", "Ana"),
  realizedAt: "2026-10-20T15:00:00.000Z",
  ...overrides,
});

const now = new Date("2026-10-22T15:00:00.000Z");

describe("salesInsights", () => {
  it("variation compara com o período anterior e devolve null sem base", () => {
    expect(variation(150, 100)).toBe(0.5);
    expect(variation(50, 100)).toBe(-0.5);
    expect(variation(10, 0)).toBeNull();
  });

  it("buildKpis traz a semana escolhida e a anterior, ou só a campanha sem filtro", () => {
    const sales = [
      sale({ value: 3000 }),
      sale({ value: 1000 }),
      sale({ value: 2000, realizedAt: "2026-10-13T15:00:00.000Z" }),
    ];

    expect(buildKpis(sales, resolvePeriod({ value: "2026-10-19" }, now))).toEqual({
      current: { total: 4000, count: 2, average: 2000 },
      previous: { total: 2000, count: 1, average: 2000 },
    });
    expect(buildKpis(sales, null)).toEqual({
      current: { total: 6000, count: 3, average: 2000 },
      previous: null,
    });
  });

  it("ticket médio por setor e por pessoa, do maior para o menor", () => {
    const sales = [
      sale({ value: 1000 }),
      sale({ value: 3000 }),
      sale({ value: 9000, segment: "b2g", vendorId: vendor("v2", "Bia") }),
    ];

    expect(ticketBySegment(sales)).toEqual([
      { key: "B2G", label: "B2G", value: 9000, detail: "1 venda" },
      { key: "B2B", label: "B2B", value: 2000, detail: "2 vendas" },
    ]);
    expect(ticketByVendor(sales).map((item) => [item.label, item.value])).toEqual([
      ["Bia", 9000],
      ["Ana", 2000],
    ]);
  });

  it("cancelamentos contam a taxa, o valor perdido e quem perdeu", () => {
    const summary = cancellationSummary([
      sale({}),
      sale({}),
      sale({ dealStatus: "cancelada", value: 500 }),
      sale({
        dealStatus: "cancelada",
        value: 700,
        vendorId: vendor("v2", "Bia"),
      }),
    ]);

    expect(summary).toMatchObject({
      count: 2,
      closed: 4,
      rate: 0.5,
      lostValue: 1200,
    });
    expect(summary.byVendor).toEqual([
      { key: "v2", label: "Bia", value: 700, detail: "1 cancelada" },
      { key: "v1", label: "Ana", value: 500, detail: "1 cancelada" },
    ]);
  });

  it("o calendário mostra o mês inteiro, separa dias fora do período e dias que ainda não chegaram", () => {
    const { months, max } = salesCalendar(
      [
        sale({ realizedAt: "2026-10-20T03:00:00.000Z" }),
        sale({ realizedAt: "2026-10-20T15:00:00.000Z", value: 500 }),
        sale({ realizedAt: "2026-10-21T15:00:00.000Z" }),
      ],
      { start: "2026-10-20", end: "2026-10-25" },
      "2026-10-22",
    );

    expect(months.map((month) => month.month)).toEqual(["2026-10"]);
    const october = months[0];
    const cells = october.weeks.flatMap((week) => week.cells).filter((cell) => cell.inMonth);
    expect(cells).toHaveLength(31);
    expect(october.weeks[0].cells[0]).toMatchObject({ day: "2026-09-28", inMonth: false });
    expect(cells.find((cell) => cell.day === "2026-10-19")).toMatchObject({ inPeriod: false, future: false, count: 0 });
    expect(cells.find((cell) => cell.day === "2026-10-20")).toMatchObject({ inPeriod: true, count: 2, value: 1500 });
    expect(cells.find((cell) => cell.day === "2026-10-23")).toMatchObject({ inPeriod: false, future: true });
    expect(october.total).toEqual({ count: 3, value: 2500 });
    expect(october.weekdayTotals[1]).toEqual({ count: 2, value: 1500 });
    expect(max).toBe(2);
  });

  it("o calendário cobre todos os meses do período e calendarRange vai da primeira venda até hoje", () => {
    const sales = [sale({ realizedAt: "2026-09-29T15:00:00.000Z" })];
    const range = calendarRange(sales, null, "2026-10-22");

    expect(range).toEqual({ start: "2026-09-29", end: "2026-10-22" });
    expect(salesCalendar(sales, range, "2026-10-22").months.map((month) => month.month)).toEqual([
      "2026-09",
      "2026-10",
    ]);
    expect(calendarRange([], null, "2026-10-22")).toEqual({ start: "2026-10-22", end: "2026-10-22" });
  });

  it("participação por setor soma 100%", () => {
    expect(segmentShare([sale({ value: 3000 }), sale({ segment: "b2g" })])).toEqual([
      { key: "B2B", label: "B2B", value: 3000, share: 0.75 },
      { key: "B2G", label: "B2G", value: 1000, share: 0.25 },
    ]);
  });

  it("concentração separa os 3 maiores do resto", () => {
    const sales = ["a", "b", "c", "d", "e"].map((id, index) =>
      sale({
        value: (5 - index) * 1000,
        vendorId: vendor(id, id.toUpperCase()),
      }),
    );
    const result = concentration(sales);

    expect(result.top.map((item) => item.label)).toEqual(["A", "B", "C"]);
    expect(result.topShare).toBe(0.8);
    expect(result.rest).toMatchObject({ count: 2, value: 3000, share: 0.2 });
    expect(result.rest.items.map((item) => [item.label, item.share])).toEqual([
      ["D", 0.13333333333333333],
      ["E", 0.06666666666666667],
    ]);
  });

  it("vendas por semana preenche semanas vazias e separa vendas de renovações", () => {
    expect(
      weeklyTotals(
        [
          sale({ realizedAt: "2026-10-06T15:00:00.000Z" }),
          sale({ funnelType: "farm", value: 400 }),
          sale({ value: 600 }),
        ],
        now,
      ),
    ).toEqual({
      weeks: ["2026-10-05", "2026-10-12", "2026-10-19"],
      sales: [1000, 0, 600],
      renewals: [0, 0, 400],
    });
    expect(weeklyTotals([], now)).toEqual({
      weeks: [],
      sales: [],
      renewals: [],
    });
  });

  it("forecast projeta pela média diária e calcula o ritmo para bater a meta", () => {
    const campaign = {
      days: ["2026-10-20", "2026-10-21", "2026-10-22"],
      total: [1000, 2000, 3000],
    };

    expect(forecast(campaign, 10000, "2026-10-29", now)).toEqual({
      sold: 3000,
      goal: 10000,
      remaining: 7000,
      ended: false,
      reached: false,
      daysLeft: 7,
      dailyAverage: 1000,
      projection: 10000,
      willHit: true,
      requiredPerDay: 1000,
    });
  });

  it("forecast depois do fim da campanha não projeta mais nada", () => {
    const campaign = { days: ["2026-10-20"], total: [5000] };
    const plan = forecast(campaign, 4000, "2026-10-20", now);

    expect(plan).toMatchObject({
      ended: true,
      reached: true,
      daysLeft: 0,
      projection: 5000,
      requiredPerDay: 0,
    });
  });

  it("goalTrack estende os dias até o fim e começa as linhas tracejadas em hoje", () => {
    const campaign = {
      days: ["2026-10-21", "2026-10-22"],
      total: [1000, 2000],
    };
    const track = goalTrack(campaign, 6000, "2026-10-24", now);

    expect(track.days).toEqual(["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"]);
    expect(track.actual).toEqual([1000, 2000, null, null]);
    expect(track.projection).toEqual([null, 2000, 3000, 4000]);
    expect(track.required).toEqual([null, 2000, 4000, 6000]);
  });

  it("goalTrack sem a linha de ritmo quando a meta já foi batida", () => {
    const track = goalTrack({ days: ["2026-10-22"], total: [9000] }, 6000, "2026-10-24", now);

    expect(track.required).toBeNull();
    expect(track.projection).toEqual([9000, 18000, 27000]);
  });
});
