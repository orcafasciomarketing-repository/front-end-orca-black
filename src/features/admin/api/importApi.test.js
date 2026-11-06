import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "../../../shared/apiClient.js";
import { importSales, previewImport, readCsvFile } from "./importApi";

vi.mock("../../../shared/apiClient.js", () => ({
  default: { post: vi.fn() },
}));

const report = {
  current: { count: 0, total: 0 },
  file: { count: 1, total: 1000, withVendor: 0, withoutVendor: 1 },
  errors: [],
  warnings: [],
  duplicates: [],
  ignored: [],
};

describe("importApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_USE_MOCKS", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("previewImport manda o texto do CSV como text/csv", async () => {
    api.post.mockResolvedValue({ data: { success: true, data: report } });

    await expect(previewImport("Setor\nB2B")).resolves.toEqual(report);
    expect(api.post).toHaveBeenCalledWith("/sales/import/preview", "Setor\nB2B", {
      headers: { "Content-Type": "text/csv" },
    });
  });

  it("importSales com sucesso → imported: true com o resumo", async () => {
    api.post.mockResolvedValue({ data: { success: true, data: report } });

    await expect(importSales("csv")).resolves.toEqual({ imported: true, report });
    expect(api.post).toHaveBeenCalledWith("/sales/import", "csv", { headers: { "Content-Type": "text/csv" } });
  });

  it("importSales com arquivo errado (400 com resumo) → imported: false, sem lançar erro", async () => {
    const reportWithErrors = { ...report, errors: [{ linha: 2, mensagem: "Data da venda inválida" }] };
    api.post.mockRejectedValue({ response: { status: 400, data: { success: false, data: reportWithErrors } } });

    await expect(importSales("csv")).resolves.toEqual({ imported: false, report: reportWithErrors });
  });

  it("importSales com outra falha (ex.: 400 sem resumo, servidor fora) → lança o erro", async () => {
    const error = { response: { status: 400, data: { error: "Arquivo vazio" } } };
    api.post.mockRejectedValue(error);

    await expect(importSales("")).rejects.toBe(error);
  });

  it("com VITE_USE_MOCKS=true não chama o backend", async () => {
    vi.stubEnv("VITE_USE_MOCKS", "true");

    await expect(previewImport("csv")).rejects.toThrow("dados de demonstração");
    await expect(importSales("csv")).rejects.toThrow("dados de demonstração");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("readCsvFile lê UTF-8 (Sheets) e Windows-1252 (Excel) sem quebrar os acentos", async () => {
    const utf8File = new File([new TextEncoder().encode("Classificação\nRenovação")], "sheets.csv");
    // "ç" = 0xE7 e "ã" = 0xE3 em Windows-1252
    const windowsFile = new File([new Uint8Array([0x52, 0x65, 0x6e, 0x6f, 0x76, 0x61, 0xe7, 0xe3, 0x6f])], "excel.csv");

    await expect(readCsvFile(utf8File)).resolves.toBe("Classificação\nRenovação");
    await expect(readCsvFile(windowsFile)).resolves.toBe("Renovação");
  });
});
