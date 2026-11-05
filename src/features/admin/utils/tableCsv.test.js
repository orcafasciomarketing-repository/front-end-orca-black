import { describe, expect, it } from "vitest";

import { barRows, buildChartFileName, formatCsvNumber, tableToCsv, timeSeriesRows } from "./tableCsv";

describe("tableCsv", () => {
  it("formatCsvNumber usa vírgula e deixa vazio o que não é número", () => {
    expect(formatCsvNumber(1234.5)).toBe("1234,50");
    expect(formatCsvNumber(3, 0)).toBe("3");
    expect(formatCsvNumber(null)).toBe("");
  });

  it("tableToCsv separa por ponto e vírgula, escapa e começa com BOM", () => {
    expect(
      tableToCsv([
        ["Nome", "Valor"],
        ['A; "B"', "10,00"],
      ]),
    ).toBe('﻿Nome;Valor\r\n"A; ""B""";10,00');
  });

  it("timeSeriesRows monta uma linha por dia e uma coluna por série", () => {
    const rows = timeSeriesRows(["2026-10-20"], [{ label: "Vendido", values: [1500] }], { formatLabel: () => "20/10" });

    expect(rows).toEqual([
      ["Dia", "Vendido"],
      ["20/10", "1500,00"],
    ]);
  });

  it("barRows inclui o detalhe quando pedido", () => {
    expect(
      barRows([{ label: "Caio", detail: "CS", value: 3 }], {
        detail: "Cargo",
        value: "Passagens",
        digits: 0,
      }),
    ).toEqual([
      ["Nome", "Cargo", "Passagens"],
      ["Caio", "CS", "3"],
    ]);
  });

  it("buildChartFileName usa o título sem acento, o setor e a semana", () => {
    const date = new Date(2026, 9, 22);

    expect(buildChartFileName({ title: "Vendas x renovações por dia" }, date)).toBe(
      "grafico-vendas-x-renovacoes-por-dia-2026-10-22.csv",
    );
    expect(buildChartFileName({ title: "Ticket médio", weekKey: "2026-10-19", segment: "B2B" }, date)).toBe(
      "grafico-ticket-medio-b2b-semana-2026-10-19-2026-10-22.csv",
    );
  });
});
