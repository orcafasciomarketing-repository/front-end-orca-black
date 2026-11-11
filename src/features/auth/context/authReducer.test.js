import { describe, expect, it } from "vitest";

import authReducer from "./authReducer";

const master = { _id: "m", email: "master@x.com", role: "master" };
const vendor = { _id: "v", email: "v@x.com", role: "vendor" };

describe("authReducer: acessar como", () => {
  it("entra como outra pessoa guardando quem abriu, e volta para a conta original", () => {
    const logged = authReducer(
      { user: null, token: null, isLoading: false },
      { type: "SET_USER", payload: { user: master, token: "tm" } },
    );
    const as = authReducer(logged, {
      type: "START_IMPERSONATION",
      payload: { user: vendor, token: "tv", impersonatedBy: master },
    });
    expect(as).toMatchObject({ user: vendor, token: "tv", impersonatedBy: master });

    const back = authReducer(as, { type: "END_IMPERSONATION", payload: { user: master, token: "tm2" } });
    expect(back).toMatchObject({ user: master, token: "tm2", impersonatedBy: null });
  });

  it("sair ou entrar de novo limpa o acesso como outra pessoa", () => {
    const as = { user: vendor, token: "tv", impersonatedBy: master, isLoading: false };
    expect(authReducer(as, { type: "REVOKE_DATA" }).impersonatedBy).toBeNull();
    expect(authReducer(as, { type: "SET_USER", payload: { user: master, token: "t" } }).impersonatedBy).toBeNull();
  });
});
