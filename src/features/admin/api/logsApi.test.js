import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "../../../shared/apiClient.js";
import { getLocalErrorLogs } from "../../../shared/errorLogger";
import { getErrorLogs, getTestReport, TEST_REPORT_URL, toTestReport } from "./logsApi";

vi.mock("../../../shared/apiClient.js", () => ({
  default: { get: vi.fn() },
}));
vi.mock("../../../shared/errorLogger", () => ({
  getLocalErrorLogs: vi.fn(),
}));

const vitestReport = {
  success: false,
  numTotalTests: 3,
  numPassedTests: 2,
  numFailedTests: 1,
  numPendingTests: 0,
  numTodoTests: 0,
  startTime: Date.UTC(2026, 9, 22, 15, 0, 0),
  testResults: [
    {
      name: "/home/user/projeto/src/shared/utils/formatCurrency.test.js",
      status: "failed",
      assertionResults: [
        { fullName: "formatCurrency formata", status: "passed", duration: 2, failureMessages: [] },
        { fullName: "formatCurrency zero", status: "failed", duration: 3, failureMessages: ["esperado R$ 0,00"] },
      ],
    },
  ],
};

describe("logsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_USE_MOCKS", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("getErrorLogs busca os logs no backend", async () => {
    api.get.mockResolvedValue({ data: { success: true, data: [{ _id: "1", message: "Quebrou" }] } });

    await expect(getErrorLogs()).resolves.toEqual([{ _id: "1", message: "Quebrou" }]);
    expect(api.get).toHaveBeenCalledWith("/logs");
  });

  it("getErrorLogs com VITE_USE_MOCKS=true lê os logs guardados no navegador", async () => {
    vi.stubEnv("VITE_USE_MOCKS", "true");
    getLocalErrorLogs.mockReturnValue([{ _id: "local" }]);

    await expect(getErrorLogs()).resolves.toEqual([{ _id: "local" }]);
    expect(api.get).not.toHaveBeenCalled();
  });

  it("toTestReport resume o relatório do Vitest", () => {
    expect(toTestReport(vitestReport)).toEqual({
      success: false,
      total: 3,
      passed: 2,
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
    });
  });

  it("getTestReport lê o JSON gerado pelo npm test", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve(vitestReport),
      }),
    );

    const report = await getTestReport();

    expect(fetch).toHaveBeenCalledWith(TEST_REPORT_URL, { cache: "no-store" });
    expect(report.passed).toBe(2);
  });

  it("getTestReport devolve null quando o relatório ainda não foi gerado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ "content-type": "text/html" }) }),
    );

    await expect(getTestReport()).resolves.toBeNull();
  });
});
