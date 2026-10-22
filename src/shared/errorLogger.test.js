import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "./apiClient.js";
import { buildErrorLog, getLocalErrorLogs, installGlobalErrorHandlers, reportError } from "./errorLogger";

vi.mock("./apiClient.js", () => ({
  default: { post: vi.fn() },
}));

describe("errorLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.localStorage.clear();
    vi.stubEnv("VITE_USE_MOCKS", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("buildErrorLog junta mensagem, stack, local, componente, página e horário", () => {
    const error = new Error("Quebrou");

    const log = buildErrorLog(error, { location: "Tela X", componentStack: "at Tela" });

    expect(log).toMatchObject({
      level: "error",
      message: "Quebrou",
      stack: error.stack,
      componentStack: "at Tela",
      location: "Tela X",
      url: window.location.href,
    });
    expect(new Date(log.occurredAt).toString()).not.toBe("Invalid Date");
  });

  it("buildErrorLog aceita algo que não é Error", () => {
    expect(buildErrorLog("texto solto").message).toBe("texto solto");
    expect(buildErrorLog("texto solto").location).toBe("Desconhecido");
  });

  it("reportError envia o log para o backend", async () => {
    api.post.mockResolvedValue({});

    await reportError(new Error("Quebrou"), { location: "Tela X" });

    expect(api.post).toHaveBeenCalledWith("/logs", expect.objectContaining({ message: "Quebrou", location: "Tela X" }));
    expect(getLocalErrorLogs()).toEqual([]);
  });

  it("reportError guarda no navegador quando o backend falha", async () => {
    api.post.mockRejectedValue(new Error("offline"));

    await reportError(new Error("Quebrou"), { location: "Tela X" });

    expect(getLocalErrorLogs()).toEqual([expect.objectContaining({ message: "Quebrou", _id: expect.any(String) })]);
  });

  it("com VITE_USE_MOCKS=true guarda no navegador sem chamar o backend, do mais novo para o mais antigo", async () => {
    vi.stubEnv("VITE_USE_MOCKS", "true");

    await reportError(new Error("primeiro"));
    await reportError(new Error("segundo"));

    expect(api.post).not.toHaveBeenCalled();
    expect(getLocalErrorLogs().map((log) => log.message)).toEqual(["segundo", "primeiro"]);
  });

  it("installGlobalErrorHandlers registra erros soltos e promises sem tratamento", async () => {
    api.post.mockResolvedValue({});
    const uninstall = installGlobalErrorHandlers();

    window.dispatchEvent(new ErrorEvent("error", { error: new Error("solto"), filename: "app.js", lineno: 7 }));
    const rejection = new Event("unhandledrejection");
    rejection.reason = new Error("promise");
    window.dispatchEvent(rejection);
    uninstall();

    expect(api.post).toHaveBeenCalledWith("/logs", expect.objectContaining({ message: "solto", location: "Global (app.js:7)" }));
    expect(api.post).toHaveBeenCalledWith(
      "/logs",
      expect.objectContaining({ message: "promise", location: "Promise sem tratamento" }),
    );
  });
});
