import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getTestReport } from "../../api/logsApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import TestReportWidget from "./TestReportWidget";

vi.mock("../../api/logsApi", () => ({
  getTestReport: vi.fn(),
}));

const report = {
  success: false,
  total: 2,
  passed: 1,
  failed: 1,
  skipped: 0,
  ranAt: "2026-10-22T15:00:00.000Z",
  files: [
    {
      name: "shared/utils/formatCurrency.test.js",
      status: "failed",
      tests: [
        { name: "formatCurrency formata", status: "passed", duration: 2, failureMessages: [] },
        { name: "formatCurrency zero", status: "failed", duration: 3, failureMessages: ["esperado R$ 0,00"] },
      ],
    },
  ],
};

describe("TestReportWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra o resumo, os arquivos e os testes com a mensagem de falha", async () => {
    getTestReport.mockResolvedValue(report);

    renderWithQuery(<TestReportWidget />);

    expect(await screen.findByText("1/2")).toBeInTheDocument();
    expect(screen.getByText(/1 passaram · 1 falharam · 0 pulados/)).toBeInTheDocument();
    expect(screen.getByText(/shared\/utils\/formatCurrency\.test\.js/)).toBeInTheDocument();
    expect(screen.getByText(/formatCurrency zero/)).toBeInTheDocument();
    expect(screen.getByText("esperado R$ 0,00")).toBeInTheDocument();
  });

  it("explica como gerar o relatório quando ele não existe", async () => {
    getTestReport.mockResolvedValue(null);

    renderWithQuery(<TestReportWidget />);

    expect(await screen.findByText("Nenhum relatório encontrado. Rode npm test para gerar.")).toBeInTheDocument();
  });
});
