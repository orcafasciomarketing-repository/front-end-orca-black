import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "../../../shared/apiClient.js";
import { createUser, deleteUser, getUserErrorMessage, getUsers, updateUser } from "./usersApi";

vi.mock("../../../shared/apiClient.js", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe("usersApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_USE_MOCKS", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("chama as rotas /users do backend", async () => {
    api.get.mockResolvedValue({ data: { data: [{ email: "a@b.com" }] } });
    api.post.mockResolvedValue({ data: { data: { email: "a@b.com" } } });
    api.patch.mockResolvedValue({ data: { data: { role: "b2g" } } });
    api.delete.mockResolvedValue({ data: {} });

    await expect(getUsers()).resolves.toEqual([{ email: "a@b.com" }]);
    await createUser({ email: "a@b.com", role: "b2b" });
    await updateUser({ id: "1", changes: { role: "b2g" } });
    await deleteUser("1");

    expect(api.get).toHaveBeenCalledWith("/users");
    expect(api.post).toHaveBeenCalledWith("/users", { email: "a@b.com", role: "b2b" });
    expect(api.patch).toHaveBeenCalledWith("/users/1", { role: "b2g" });
    expect(api.delete).toHaveBeenCalledWith("/users/1");
  });

  it("com VITE_USE_MOCKS=true: lista vazia e não grava nada", async () => {
    vi.stubEnv("VITE_USE_MOCKS", "true");

    await expect(getUsers()).resolves.toEqual([]);
    await expect(createUser({})).rejects.toThrow("dados de demonstração");
    await expect(updateUser({ id: "1", changes: {} })).rejects.toThrow("dados de demonstração");
    await expect(deleteUser("1")).rejects.toThrow("dados de demonstração");
    expect(api.get).not.toHaveBeenCalled();
  });

  it("getUserErrorMessage prefere a mensagem do backend", () => {
    expect(getUserErrorMessage({ message: "Request failed", response: { data: { error: "Cadastro já realizado" } } })).toBe(
      "Cadastro já realizado",
    );
    expect(getUserErrorMessage(new Error("Network Error"))).toBe("Network Error");
  });
});
