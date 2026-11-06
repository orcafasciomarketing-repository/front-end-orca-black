import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithQuery } from "../../../../test/renderWithQuery";
import { AuthContext } from "../../../auth/context/AuthContext";
import { reportError } from "../../../../shared/errorLogger";
import { createUser, deleteUser, getUsers, updateUser } from "../../api/usersApi";
import UsersWidget from "./UsersWidget";

vi.mock("../../api/usersApi", async (importOriginal) => ({
  ...(await importOriginal()),
  getUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock("../../../../shared/errorLogger", () => ({ reportError: vi.fn() }));

const USERS = [
  { _id: "u-admin", email: "admin@empresa.com", role: "admin" },
  { _id: "u-b2b", email: "b2b@empresa.com", role: "b2b" },
  // Usuário antigo, sem perfil
  { _id: "u-antigo", email: "antigo@empresa.com" },
];

const renderWidget = () =>
  renderWithQuery(
    <AuthContext value={{ state: { user: USERS[0], token: "t" } }}>
      <UsersWidget />
    </AuthContext>,
  );

const itemOf = (email) => screen.getByText(email).closest("li");
const createForm = () => screen.getByRole("form", { name: "Cadastrar usuário" });

const fillCreateForm = ({ email, role, password, passwordConfirmation = password }) => {
  const form = within(createForm());
  fireEvent.change(form.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(form.getByLabelText("Perfil"), { target: { value: role } });
  fireEvent.change(form.getByLabelText("Senha"), { target: { value: password } });
  fireEvent.change(form.getByLabelText("Confirmar senha"), { target: { value: passwordConfirmation } });
};

describe("UsersWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUsers.mockResolvedValue(USERS);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lista os usuários com o perfil; o antigo, sem perfil, aparece como admin", async () => {
    renderWidget();

    expect(await screen.findByText("b2b@empresa.com")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Perfil de b2b@empresa.com" })).toHaveValue("b2b");
    expect(screen.getByRole("combobox", { name: "Perfil de antigo@empresa.com" })).toHaveValue("admin");
  });

  it("o próprio usuário aparece como (você), sem trocar o perfil nem excluir", async () => {
    renderWidget();
    await screen.findByText("admin@empresa.com");

    const me = itemOf("admin@empresa.com");
    expect(me).toHaveTextContent("(você)");
    expect(within(me).getByRole("combobox")).toBeDisabled();
    expect(within(me).queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });

  it("cadastra com email, perfil e senha e limpa o formulário", async () => {
    createUser.mockResolvedValue({ _id: "novo", email: "novo@empresa.com", role: "b2g" });
    renderWidget();
    await screen.findByText("b2b@empresa.com");

    fillCreateForm({ email: "novo@empresa.com", role: "b2g", password: "123456" });
    fireEvent.click(within(createForm()).getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("Usuário cadastrado")).toBeInTheDocument();
    expect(createUser).toHaveBeenCalledWith({
      email: "novo@empresa.com",
      role: "b2g",
      password: "123456",
      passwordConfirmation: "123456",
    });
    expect(within(createForm()).getByLabelText("Email")).toHaveValue("");
    // Busca a lista de novo
    await waitFor(() => expect(getUsers).toHaveBeenCalledTimes(2));
  });

  it("senhas diferentes ou curtas: avisa e não chama o backend", async () => {
    renderWidget();
    await screen.findByText("b2b@empresa.com");

    fillCreateForm({ email: "novo@empresa.com", role: "b2b", password: "123456", passwordConfirmation: "654321" });
    fireEvent.click(within(createForm()).getByRole("button", { name: "Cadastrar" }));
    expect(screen.getByText("As senhas são diferentes")).toBeInTheDocument();

    fillCreateForm({ email: "novo@empresa.com", role: "b2b", password: "123" });
    fireEvent.click(within(createForm()).getByRole("button", { name: "Cadastrar" }));
    expect(screen.getByText("A senha precisa ter pelo menos 6 caracteres")).toBeInTheDocument();

    expect(createUser).not.toHaveBeenCalled();
  });

  it("email já cadastrado: mostra a mensagem do backend e não manda para os logs de erro", async () => {
    createUser.mockRejectedValue({ message: "Request failed", response: { status: 409, data: { error: "Cadastro já realizado" } } });
    renderWidget();
    await screen.findByText("b2b@empresa.com");

    fillCreateForm({ email: "b2b@empresa.com", role: "b2b", password: "123456" });
    fireEvent.click(within(createForm()).getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("Não foi possível cadastrar: Cadastro já realizado")).toBeInTheDocument();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("servidor fora do ar: aí sim vai para os logs de erro", async () => {
    createUser.mockRejectedValue(new Error("Network Error"));
    renderWidget();
    await screen.findByText("b2b@empresa.com");

    fillCreateForm({ email: "novo@empresa.com", role: "b2b", password: "123456" });
    fireEvent.click(within(createForm()).getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("Não foi possível cadastrar: Network Error")).toBeInTheDocument();
    expect(reportError).toHaveBeenCalled();
  });

  it("trocar o perfil salva na hora", async () => {
    updateUser.mockResolvedValue({});
    renderWidget();
    await screen.findByText("b2b@empresa.com");

    fireEvent.change(screen.getByRole("combobox", { name: "Perfil de b2b@empresa.com" }), { target: { value: "b2g" } });

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ id: "u-b2b", changes: { role: "b2g" } }));
  });

  it("trocar a senha de outro usuário", async () => {
    updateUser.mockResolvedValue({});
    renderWidget();
    await screen.findByText("b2b@empresa.com");

    const item = within(itemOf("b2b@empresa.com"));
    fireEvent.click(item.getByRole("button", { name: "Trocar senha" }));
    fireEvent.change(item.getByLabelText("Nova senha"), { target: { value: "senha-nova" } });
    fireEvent.change(item.getByLabelText("Confirmar nova senha"), { target: { value: "senha-nova" } });
    fireEvent.click(item.getByRole("button", { name: "Salvar senha" }));

    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({
        id: "u-b2b",
        changes: { password: "senha-nova", passwordConfirmation: "senha-nova" },
      }),
    );
    await waitFor(() => expect(item.queryByLabelText("Nova senha")).not.toBeInTheDocument());
  });

  it("excluir pede confirmação; cancelando, nada acontece", async () => {
    deleteUser.mockResolvedValue();
    renderWidget();
    await screen.findByText("b2b@empresa.com");

    window.confirm.mockReturnValueOnce(false);
    fireEvent.click(within(itemOf("b2b@empresa.com")).getByRole("button", { name: "Excluir" }));
    expect(deleteUser).not.toHaveBeenCalled();

    fireEvent.click(within(itemOf("b2b@empresa.com")).getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith("u-b2b"));
  });
});
