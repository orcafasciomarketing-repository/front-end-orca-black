import { describe, expect, it } from "vitest";

import { buildMockDatabase } from "../../../shared/mocks/mockDatabase";
import {
  findAllSales,
  getPeoplePoints,
  getPrizes,
  getPrizeWithdrawals,
  getScoreboard,
} from "../../../shared/mocks/mockBackend";
import { getGoalProgress } from "../../../shared/mocks/mockGoals";
import { peopleSheet, prizeBalanceSheet, salesSheet, teamsSheet, withdrawalsSheet } from "./campaignReports";
import { goalSheets } from "./goalReports";
import { buildWorkbook, reportFileName, sheetName } from "./xlsx";

const now = new Date("2026-10-21T15:00:00.000Z");
const db = buildMockDatabase(now);

describe("planilhas dos relatórios", () => {
  it("vendas: uma linha por venda, valor e data como número e data, e a soma das ativas no fim", () => {
    const sheet = salesSheet(findAllSales(db).data);
    expect(sheet.columns.map((column) => column.header)).toEqual([
      "Negociação",
      "Status",
      "Valor",
      "Tipo",
      "Setor",
      "Vendedor",
      "Passagem",
      "Data da venda",
      "ID na RD",
    ]);
    expect(sheet.rows).toHaveLength(18);
    expect(typeof sheet.rows[0].value).toBe("number");
    expect(sheet.rows[0].date).toBeInstanceOf(Date);
    const active = sheet.rows.filter((row) => row.status === "Ativa");
    expect(sheet.totals.value).toBe(active.reduce((sum, row) => sum + row.value, 0));
    expect(sheet.totals.deal).toBe(`Total das ativas (${active.length})`);
  });

  it("pontos, times e prêmios trazem as colunas do sistema", () => {
    const people = peopleSheet(getPeoplePoints(db, {}, now));
    expect(people.rows[0]).toMatchObject({ position: 1, kind: expect.any(String), team: expect.any(String) });
    const teams = teamsSheet(getScoreboard(db, "all", now));
    expect(teams.rows.map((row) => row.position)).toEqual([1, 2, 3]);
    expect(prizeBalanceSheet(getPrizes(db, null, now)).columns.map((column) => column.key)).toContain("balance");
    expect(withdrawalsSheet(getPrizeWithdrawals(db, null, now)).name).toBe("Retiradas");
  });

  it("metas do mês: abas de vendedores, semanas, setores e times; com setor, só as pessoas dele", () => {
    const progress = getGoalProgress(db, "2026-10", now);
    const all = goalSheets(progress, "");
    expect(all.map((sheet) => sheet.name)).toEqual(["Vendedores", "Semanas", "Setores", "Times"]);
    expect(all[0].rows).toHaveLength(progress.people.length);
    expect(all[0].columns.map((column) => column.header)).toContain("Meta black");
    expect(all[1].rows).toHaveLength(progress.people.length * progress.weeks.length);
    const week = progress.people[0].weeks[0];
    expect(all[1].rows[0].perDay).toBeCloseTo(week.tiers.goal / week.pace.totalDays, 2);
    expect(all[2].rows.at(-1)).toMatchObject({ segment: "Todos", part: "Total" });

    const b2b = goalSheets(progress, "b2b");
    expect(b2b[0].rows.every((row) => row.segment === "B2B")).toBe(true);
    expect(b2b[2].rows.map((row) => row.part)).toEqual(["Total", "Farmer", "Venda"]);
  });

  it("o .xlsx sai com cabeçalho em negrito, filtro, R$ e % formatados e a linha de total", async () => {
    const sheet = salesSheet(findAllSales(db).data);
    const workbook = await buildWorkbook([sheet, goalSheets(getGoalProgress(db, "2026-10", now), "")[0]]);
    const sales = workbook.getWorksheet("Vendas");

    expect(sales.getRow(1).font.bold).toBe(true);
    expect(sales.autoFilter).toBeTruthy();
    expect(sales.getColumn("value").numFmt).toBe('"R$" #,##0.00');
    expect(sales.rowCount).toBe(1 + 18 + 1);
    expect(sales.getRow(20).font.bold).toBe(true);
    expect(workbook.getWorksheet("Vendedores").getColumn("percent").numFmt).toBe("0.0%");

    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("nome do arquivo sem acento e com a data; nome da aba sem caracteres proibidos e com até 31 letras", () => {
    expect(reportFileName("vendas", ["Campanha Black", "B2B", null], new Date("2026-11-11T12:00:00"))).toBe(
      "vendas-campanha-black-b2b-2026-11-11.xlsx",
    );
    expect(sheetName("Saldo/prêmios: [teste] com um nome muito comprido")).toHaveLength(31);
    expect(sheetName("a/b")).toBe("a b");
  });
});
