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
  it("logado: Trocar senha, Modo escuro e Sair no pé do menu, nessa ordem", () => {
    renderLayout(loggedAuth());

    const buttons = screen.getByRole("complementary").querySelectorAll("button");
    expect([...buttons].map((button) => button.textContent)).toEqual(["Trocar senha", "Modo escuro", "Sair"]);
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
