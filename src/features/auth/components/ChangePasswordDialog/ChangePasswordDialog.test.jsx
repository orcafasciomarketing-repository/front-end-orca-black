import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { changePassword } from "../../api/authApi";
import ChangePasswordDialog from "./ChangePasswordDialog";

vi.mock("../../api/authApi", async (importOriginal) => ({
  ...(await importOriginal()),
  changePassword: vi.fn(),
}));

const fill = ({ currentPassword = "123456", password = "nova123", passwordConfirmation = password } = {}) => {
  fireEvent.change(screen.getByLabelText("Senha atual"), { target: { value: currentPassword } });
  fireEvent.change(screen.getByLabelText("Senha nova"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirmar senha nova"), { target: { value: passwordConfirmation } });
};

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Salvar senha" }));

describe("ChangePasswordDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("troca a senha, avisa e devolve o usuário e o token novo", async () => {
    const onChanged = vi.fn();
    changePassword.mockResolvedValue({ user: { _id: "1" }, token: "novo" });
    render(<ChangePasswordDialog onClose={vi.fn()} onChanged={onChanged} />);

    expect(screen.getByLabelText("Senha atual")).toHaveFocus();
    fill();
    submit();

    expect(await screen.findByText("Senha alterada")).toBeInTheDocument();
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "123456",
      password: "nova123",
      passwordConfirmation: "nova123",
    });
    expect(onChanged).toHaveBeenCalledWith({ user: { _id: "1" }, token: "novo" });
  });

  it("senha nova curta ou diferente: avisa e não chama o backend", () => {
    render(<ChangePasswordDialog onClose={vi.fn()} />);

    fill({ password: "123" });
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent("A senha nova precisa ter pelo menos 6 caracteres");

    fill({ password: "nova123", passwordConfirmation: "outra123" });
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent("As senhas novas são diferentes");

    expect(changePassword).not.toHaveBeenCalled();
  });

  it("mostra o erro do backend (senha atual errada)", async () => {
    changePassword.mockRejectedValue({ response: { data: { error: "Senha atual incorreta" } } });
    render(<ChangePasswordDialog onClose={vi.fn()} />);

    fill({ currentPassword: "errada" });
    submit();

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Senha atual incorreta"));
  });

  it("Cancelar, Esc e clicar fora fecham", () => {
    const onClose = vi.fn();
    render(<ChangePasswordDialog onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog").parentElement);

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
