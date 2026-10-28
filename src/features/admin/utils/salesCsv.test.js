import { describe, expect, it } from "vitest";

import { buildExportFileName, escapeCsvCell, salesToCsv } from "./salesCsv";

const sale = {
  _id: "s1",
  rdDealId: "698c8b9b",
  rdDealName: "Obra; Fase 2",
  dealStatus: "ativa",
  value: 1199.5,
  funnelType: "farm",
  segment: "b2b",
  vendorId: { vendorName: "Bruno" },
  sdrIds: [{ name: "Juliana" }],
  realizedAt: "2026-10-09T14:07:00.000Z",
};

const rowsOf = (csv) => csv.replace("\uFEFF", "").split("\r\n");

describe("salesCsv", () => {
  it("começa com BOM e usa ; como separador, para o Excel em português abrir certo", () => {
    const csv = salesToCsv([]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(rowsOf(csv)[0]).toBe(
      "Negociação;Status;Valor (R$);Tipo;Segmento;Vendedor;Passagem;Data da venda;ID na RD",
    );
  });

  it("gera uma linha por venda com os valores traduzidos", () => {
    const [, row] = rowsOf(salesToCsv([sale]));
    const cells = row.split(/;(?=(?:[^"]*"[^"]*")*[^"]*$)/);

    expect(cells[0]).toBe('"Obra; Fase 2"');
    expect(cells[1]).toBe("Ativa");
    expect(cells[2]).toBe("1199,50");
    expect(cells[3]).toBe("Renovação");
    expect(cells[4]).toBe("B2B");
    expect(cells[5]).toBe("Bruno");
    expect(cells[6]).toBe("Juliana");
    expect(cells[7]).toMatch(/^09\/10\/2026/);
    expect(cells[8]).toBe("698c8b9b");
  });

  it("deixa a passagem vazia quando a venda não tem SDR", () => {
    const [, row] = rowsOf(salesToCsv([{ ...sale, rdDealName: "Obra", sdrIds: [] }]));

    expect(row.split(";")[6]).toBe("");
  });

  it("junta todas as pessoas da passagem na mesma célula, separadas por vírgula", () => {
    const [, row] = rowsOf(salesToCsv([{ ...sale, rdDealName: "Obra", sdrIds: [{ name: "Juliana" }, { name: "Rafael" }] }]));

    expect(row.split(";")[6]).toBe("Juliana, Rafael");
  });

  it("escapa aspas, ponto e vírgula e quebras de linha", () => {
    expect(escapeCsvCell('Obra "A"')).toBe('"Obra ""A"""');
    expect(escapeCsvCell("linha 1\nlinha 2")).toBe('"linha 1\nlinha 2"');
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell("simples")).toBe("simples");
  });

  it("nomeia o arquivo com o vendedor filtrado ou 'todos'", () => {
    const date = new Date(2026, 9, 22, 12);

    expect(buildExportFileName({}, date)).toBe("vendas-todos-2026-10-22.csv");
    expect(buildExportFileName({ vendor: { vendorName: "Gabriela Antônia" } }, date)).toBe(
      "vendas-gabriela-antonia-2026-10-22.csv",
    );
  });

  it("inclui a semana filtrada no nome do arquivo", () => {
    const date = new Date(2026, 9, 22, 12);

    expect(buildExportFileName({ weekKey: "2026-10-12" }, date)).toBe("vendas-todos-semana-2026-10-12-2026-10-22.csv");
    expect(buildExportFileName({ vendor: { vendorName: "Carla" }, weekKey: "2026-10-19" }, date)).toBe(
      "vendas-carla-semana-2026-10-19-2026-10-22.csv",
    );
  });
});
