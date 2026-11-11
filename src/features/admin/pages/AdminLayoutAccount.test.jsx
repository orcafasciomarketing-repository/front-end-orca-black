import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "../../auth/context/AuthContext";
import AdminLayout from "./AdminLayout";

vi.mock("../components/SaleToasts/SaleToasts", () => ({ default: () => null }));

const renderLayout = (auth) => {
  const router = createMemoryRouter(
    [{ path: "/admin", element: <AdminLayout />, children: [{ index: true, element: <p>Página</p> }] }],
    { initialEntries: ["/admin"] },
  );
  const page = <RouterProvider router={router} />;

  return render(auth ? <AuthContext value={auth}>{page}</AuthContext> : page);
};

const loggedAuth = () => ({
  state: { user: { _id: "1", email: "x@teste.com", role: "admin" }, token: "t" },
  dispatch: vi.fn(),
  logout: vi.fn(),
});

describe("AdminLayout: sair e trocar senha", () => {
  it("logado: Trocar senha, Modo escuro e Sair no pé do menu, nessa ordem, só com o símbolo (nome no title)", () => {
    renderLayout(loggedAuth());

    const buttons = screen.getByRole("complementary").querySelectorAll("button[title]");
    expect([...buttons].map((button) => button.getAttribute("aria-label"))).toEqual([
      "Administração",
      "Trocar senha",
      "Modo escuro",
      "Sair",
    ]);
    expect([...buttons].every((button) => button.textContent === "" && button.title)).toBe(true);
  });

  it("Sair chama o logout", () => {
    const auth = loggedAuth();
    renderLayout(auth);

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it("Trocar senha abre o diálogo, e Cancelar fecha", () => {
    renderLayout(loggedAuth());

    fireEvent.click(screen.getByRole("button", { name: "Trocar senha" }));
    expect(screen.getByRole("dialog", { name: "Trocar minha senha" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sem login (fora do provider) só mostra o Modo escuro, como antes", () => {
    renderLayout(null);

    expect(screen.getByRole("button", { name: "Modo escuro" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sair" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Trocar senha" })).not.toBeInTheDocument();
  });
});

describe("AdminLayout: pé do menu do vendedor", () => {
  it("vendedor logado vê Trocar senha, Modo escuro e Sair (sem a engrenagem da administração)", () => {
    renderLayout({
      state: { user: { _id: "2", email: "vendedor@teste.com", role: "vendor" }, token: "t" },
      dispatch: vi.fn(),
      logout: vi.fn(),
    });

    const buttons = screen.getByRole("complementary").querySelectorAll("button[title]");
    expect([...buttons].map((button) => button.getAttribute("aria-label"))).toEqual([
      "Trocar senha",
      "Modo escuro",
      "Sair",
    ]);
  });
});

describe("AdminLayout: acessar como", () => {
  const impersonatingAuth = () => ({
    state: {
      user: { _id: "u-brenda", email: "brenda@empresa.com", role: "vendor" },
      token: "t",
      impersonatedBy: { _id: "u-master", email: "master@empresa.com", role: "master" },
    },
    dispatch: vi.fn(),
    logout: vi.fn(),
    stopImpersonation: vi.fn(async () => {}),
  });

  it("mostra a faixa de quem está sendo visto; Sair e Trocar senha aparecem como na tela da pessoa, mas desativados", () => {
    renderLayout(impersonatingAuth());

    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent("Você está vendo como brenda@empresa.com (Vendedor). É só para ver");
    expect(screen.getByRole("button", { name: "Sair" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Trocar senha" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sair" })).toHaveAttribute(
      "title",
      expect.stringContaining("Voltar para minha conta"),
    );
    expect(screen.getByRole("button", { name: "Modo escuro" })).toBeInTheDocument();
  });

  it("Voltar para minha conta encerra o acesso", async () => {
    const auth = impersonatingAuth();
    renderLayout(auth);

    fireEvent.click(screen.getByRole("button", { name: "Voltar para minha conta" }));

    await vi.waitFor(() => expect(auth.stopImpersonation).toHaveBeenCalled());
  });

  it("sem acessar como, não há faixa", () => {
    renderLayout(loggedAuth());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
