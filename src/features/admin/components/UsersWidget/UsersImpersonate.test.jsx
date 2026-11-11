import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithQuery } from "../../../../test/renderWithQuery";
import { AuthContext } from "../../../auth/context/AuthContext";
import { getUsers } from "../../api/usersApi";
import UsersWidget from "./UsersWidget";

vi.mock("../../api/usersApi", async (importOriginal) => ({ ...(await importOriginal()), getUsers: vi.fn() }));
vi.mock("../../../../shared/errorLogger", () => ({ reportError: vi.fn() }));
vi.mock("../../api/slidesApi", () => ({
  getVendors: vi.fn(async () => [{ _id: "v-brenda", vendorName: "Brenda Lima" }]),
  getSdrs: vi.fn(async () => [{ _id: "s-caio", name: "Caio Martins" }]),
}));

const USERS = [
  { _id: "u-master", email: "master@empresa.com", role: "master" },
  { _id: "u-b2b", email: "b2b@empresa.com", role: "b2b" },
  { _id: "u-brenda", email: "brenda@empresa.com", role: "vendor", vendorId: "v-brenda" },
  { _id: "u-caio", email: "caio@empresa.com", role: "sdr", sdrId: "s-caio" },
];

const renderAs = (role, startImpersonation = vi.fn(async () => {})) => {
  renderWithQuery(
    <AuthContext value={{ state: { user: { _id: "u-me", email: "eu@empresa.com", role } }, startImpersonation }}>
      <UsersWidget />
    </AuthContext>,
  );
  return startImpersonation;
};

describe("UsersWidget: acessar como", () => {
  beforeEach(() => {
    getUsers.mockResolvedValue(USERS);
  });

  it("o master vê 'Acessar como' só nas contas de vendedor e passagem, e clicar entra na conta", async () => {
    const start = renderAs("master");

    expect(await screen.findByRole("button", { name: "Acessar como brenda@empresa.com" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acessar como caio@empresa.com" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acessar como b2b@empresa.com" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acessar como master@empresa.com" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Acessar como brenda@empresa.com" }));

    expect(start).toHaveBeenCalledWith("u-brenda");
  });

  it("admin não vê o botão", async () => {
    renderAs("admin");

    await screen.findByText("brenda@empresa.com");
    expect(screen.queryByRole("button", { name: /Acessar como/ })).not.toBeInTheDocument();
  });

  it("mostra a mensagem do backend quando não consegue entrar", async () => {
    renderAs(
      "master",
      vi.fn(async () => {
        throw { response: { data: { error: "Só dá para acessar como vendedor ou passagem" } } };
      }),
    );

    fireEvent.click(await screen.findByRole("button", { name: "Acessar como brenda@empresa.com" }));

    expect(
      await screen.findByText("Não foi possível acessar como a pessoa: Só dá para acessar como vendedor ou passagem"),
    ).toBeInTheDocument();
  });
});
