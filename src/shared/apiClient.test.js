import { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import api, { setAccessToken, setAuthInterceptor, setImpersonating } from "./apiClient";

const master = { _id: "m", email: "master@x.com", role: "master" };

const respond = (config, status, data) => {
  const response = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 400) {
    return Promise.reject(new AxiosError("Erro", "ERR_BAD_REQUEST", config, null, response));
  }
  return Promise.resolve(response);
};

const installServer = () => {
  const calls = [];
  api.defaults.adapter = (config) => {
    calls.push(`${config.url} ${config.headers.Authorization ?? ""}`);
    if (config.url.includes("auth/refresh")) return respond(config, 200, { user: master, token: "tm" });
    if (config.headers.Authorization === "Bearer tv")
      return respond(config, 401, { error: "Token inválido ou expirado" });
    return respond(config, 200, { ok: true });
  };
  return calls;
};

describe("apiClient: token vencido", () => {
  let eject;
  const originalAdapter = api.defaults.adapter;

  afterEach(() => {
    eject?.();
    api.defaults.adapter = originalAdapter;
    setImpersonating(false);
    setAccessToken(null);
  });

  it("vendo como outra pessoa: o acesso vencido volta para a conta do master, sem repetir o pedido", async () => {
    const calls = installServer();
    const dispatch = vi.fn();
    eject = setAuthInterceptor(dispatch);
    setAccessToken("tv");
    setImpersonating(true);

    await expect(api.get("/me")).rejects.toThrow();

    expect(dispatch).toHaveBeenCalledWith({ type: "END_IMPERSONATION", payload: { user: master, token: "tm" } });
    expect(calls.filter((call) => call.startsWith("/me"))).toHaveLength(1);
  });

  it("na própria conta: renova o token e repete o pedido, como antes", async () => {
    const calls = installServer();
    const dispatch = vi.fn();
    eject = setAuthInterceptor(dispatch);
    setAccessToken("tv");

    const response = await api.get("/me");

    expect(response.data).toEqual({ ok: true });
    expect(dispatch).toHaveBeenCalledWith({ type: "ALTER_TOKEN", payload: { token: "tm" } });
    expect(calls.at(-1)).toBe("/me Bearer tm");
  });
});
