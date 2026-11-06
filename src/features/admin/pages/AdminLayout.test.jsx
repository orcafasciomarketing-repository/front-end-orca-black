import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "../../auth/context/AuthContext";
import AdminLayout from "./AdminLayout";

const renderAt = (path) => {
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <p>Página dashboard</p> },
          { path: "graficos", element: <p>Página gráficos</p> },
          { path: "erros", element: <p>Página erros</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  );

  return render(<RouterProvider router={router} />);
};

describe("AdminLayout", () => {
  it("mostra o menu com Dashboard e Erros e abre no dashboard", () => {
    renderAt("/admin");

    const menu = screen.getByRole("navigation", { name: "Menu principal" });
    expect(menu).toHaveTextContent("Dashboard");
    expect(menu).toHaveTextContent("Erros");
    expect(screen.getByText("Página dashboard")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });

  it("troca para a aba Erros sem recarregar a página", () => {
    renderAt("/admin");

    fireEvent.click(screen.getByRole("link", { name: "Erros" }));

    expect(screen.getByText("Página erros")).toBeInTheDocument();
    expect(screen.queryByText("Página dashboard")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Erros" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("abrindo direto em /admin/erros, só Erros fica marcado", () => {
    renderAt("/admin/erros");

    expect(screen.getByText("Página erros")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("abre a aba Gráficos pelo menu", () => {
    renderAt("/admin");

    fireEvent.click(screen.getByRole("link", { name: "Gráficos" }));

    expect(screen.getByText("Página gráficos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gráficos" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  describe("perfis", () => {
    const menuLinks = () =>
      screen.getAllByRole("link").map((link) => link.textContent);

    const renderAs = (role) => {
      const router = createMemoryRouter(
        [{ path: "/admin", element: <AdminLayout />, children: [{ index: true, element: <p>Página dashboard</p> }] }],
        { initialEntries: ["/admin"] },
      );

      return render(
        <AuthContext value={{ state: { user: { _id: "1", email: "x@teste.com", role }, token: "t" } }}>
          <RouterProvider router={router} />
        </AuthContext>,
      );
    };

    it("admin vê todas as telas, inclusive Importação, Erros e Usuários", () => {
      renderAs("admin");

      expect(menuLinks()).toEqual(["Dashboard", "Gráficos", "Importação", "Erros", "Usuários"]);
    });

    it("usuário antigo, sem perfil, continua vendo tudo", () => {
      renderAs(undefined);

      expect(menuLinks()).toEqual(["Dashboard", "Gráficos", "Importação", "Erros", "Usuários"]);
    });

    for (const role of ["b2b", "b2g"]) {
      it(`${role} só vê Dashboard e Gráficos`, () => {
        renderAs(role);

        expect(menuLinks()).toEqual(["Dashboard", "Gráficos"]);
      });
    }
  });
});
