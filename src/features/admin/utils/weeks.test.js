import { describe, expect, it } from "vitest";

import {
  filterSalesByWeek,
  formatWeekLabel,
  getFirstWeekOfMonth,
  getWeekKey,
  getWeekRange,
  listWeeks,
  previousWeekKey,
} from "./weeks";

const now = new Date("2026-10-22T15:00:00.000Z");

describe("weeks", () => {
  it("getWeekKey usa a segunda-feira da semana no horário de São Paulo", () => {
    expect(getWeekKey("2026-10-22T15:00:00.000Z")).toBe("2026-10-19");
  });

  it("domingo 23:59 em São Paulo ainda é da semana que está acabando", () => {
    expect(getWeekKey("2026-10-19T02:59:59.999Z")).toBe("2026-10-12");
  });

  it("segunda 00:00 em São Paulo já é a semana nova", () => {
    expect(getWeekKey("2026-10-19T03:00:00.000Z")).toBe("2026-10-19");
  });

  it("previousWeekKey volta 7 dias, inclusive na virada do mês", () => {
    expect(previousWeekKey("2026-10-19")).toBe("2026-10-12");
    expect(previousWeekKey("2026-11-02")).toBe("2026-10-26");
  });

  it("getWeekRange vai de segunda 00:00 até a segunda seguinte, em São Paulo", () => {
    const { start, end } = getWeekRange("2026-10-19");

    expect(start.toISOString()).toBe("2026-10-19T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-26T03:00:00.000Z");
  });

  it("formatWeekLabel destaca a semana atual e a passada", () => {
    expect(formatWeekLabel("2026-10-19", now)).toBe("Semana atual (19/10 a 25/10)");
    expect(formatWeekLabel("2026-10-12", now)).toBe("Semana passada (12/10 a 18/10)");
    expect(formatWeekLabel("2026-09-28", now)).toBe("28/09 a 04/10");
  });

  it("getFirstWeekOfMonth é a semana do dia 1º do mês, mesmo que comece no mês anterior", () => {
    expect(getFirstWeekOfMonth(now)).toBe("2026-09-28");
    expect(getFirstWeekOfMonth(new Date("2026-11-10T15:00:00.000Z"))).toBe("2026-10-26");
  });

  it("getFirstWeekOfMonth usa o mês de São Paulo na virada do mês", () => {
    expect(getFirstWeekOfMonth(new Date("2026-11-01T02:00:00.000Z"))).toBe("2026-09-28");
  });

  it("listWeeks mostra todas as semanas do mês até a atual, mesmo sem vendas", () => {
    expect(listWeeks([], now)).toEqual([
      { key: "2026-10-19", label: "Semana atual (19/10 a 25/10)" },
      { key: "2026-10-12", label: "Semana passada (12/10 a 18/10)" },
      { key: "2026-10-05", label: "05/10 a 11/10" },
      { key: "2026-09-28", label: "28/09 a 04/10" },
    ]);
  });

  it("listWeeks no começo do mês mostra a semana atual e a do dia 1º", () => {
    const earlyNovember = new Date("2026-11-03T15:00:00.000Z");

    expect(listWeeks([], earlyNovember).map((week) => week.key)).toEqual(["2026-11-02", "2026-10-26"]);
  });

  it("listWeeks volta mais se houver venda antes do mês", () => {
    const sales = [{ realizedAt: "2026-09-15T12:00:00.000Z" }];

    expect(listWeeks(sales, now).map((week) => week.key)).toEqual([
      "2026-10-19",
      "2026-10-12",
      "2026-10-05",
      "2026-09-28",
      "2026-09-21",
      "2026-09-14",
    ]);
  });

  it("filterSalesByWeek sem semana devolve tudo", () => {
    const sales = [{ realizedAt: "2026-10-01T12:00:00.000Z" }];

    expect(filterSalesByWeek(sales, "")).toBe(sales);
  });

  it("filterSalesByWeek mantém só as vendas da semana, respeitando os limites", () => {
    const sales = [
      { _id: "domingo-antes", realizedAt: "2026-10-19T02:59:59.999Z" },
      { _id: "segunda-inicio", realizedAt: "2026-10-19T03:00:00.000Z" },
      { _id: "domingo-fim", realizedAt: "2026-10-26T02:59:59.999Z" },
      { _id: "segunda-depois", realizedAt: "2026-10-26T03:00:00.000Z" },
    ];

    expect(filterSalesByWeek(sales, "2026-10-19").map((sale) => sale._id)).toEqual(["segunda-inicio", "domingo-fim"]);
  });
});
