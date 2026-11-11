import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { AuthContext } from "../../auth/context/AuthContext";
import ThemeContextProvider from "../../../shared/context/ThemeContext";
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

    it("master vê todas as telas, inclusive Importação, Erros e Usuários", () => {
      renderAs("master");

      const groups = [...document.querySelectorAll("nav p")].map((label) => label.textContent);
      expect(groups).toEqual(["Campanha", "Metas do mês", "Administração"]);

      expect(menuLinks()).toEqual([
        "Dashboard",
        "Gráficos",
        "Previsão",
        "Prêmios",
        "Metas por vendedor",
        "Cadastro de metas",
        "Campanhas",
        "Importação",
        "Erros",
        "Usuários",
      ]);
    });

    it("admin vê Usuários, mas não Importação nem Erros", () => {
      renderAs("admin");

      expect(menuLinks()).toEqual([
        "Dashboard",
        "Gráficos",
        "Previsão",
        "Prêmios",
        "Metas por vendedor",
        "Cadastro de metas",
        "Campanhas",
        "Usuários",
      ]);
    });

    it("sem perfil (backend antigo) continua vendo tudo", () => {
      renderAs(undefined);

      expect(menuLinks()).toEqual([
        "Dashboard",
        "Gráficos",
        "Previsão",
        "Prêmios",
        "Metas por vendedor",
        "Cadastro de metas",
        "Campanhas",
        "Importação",
        "Erros",
        "Usuários",
      ]);
    });

    for (const role of ["b2b", "b2g"]) {
      it(`${role} só vê Dashboard e Gráficos`, () => {
        renderAs(role);

        expect(menuLinks()).toEqual(["Dashboard", "Gráficos", "Previsão", "Prêmios"]);
      });
    }
  });

  describe("modo escuro", () => {
    const renderWithTheme = (path = "/admin") => {
      const router = createMemoryRouter(
        [{ path: "/admin", element: <AdminLayout />, children: [{ index: true, element: <p>Página dashboard</p> }] }],
        { initialEntries: [path] },
      );

      return render(
        <ThemeContextProvider>
          <RouterProvider router={router} />
        </ThemeContextProvider>,
      );
    };

    const layout = () => screen.getByRole("navigation", { name: "Menu principal" }).closest("[data-theme]");

    afterEach(() => {
      localStorage.clear();
    });

    it("o botão fica no menu lateral, começa no claro, liga e desliga o tema do admin inteiro", () => {
      renderWithTheme();

      const toggle = within(screen.getByRole("complementary")).getByRole("button", { name: "Modo escuro" });
      expect(toggle).toHaveAttribute("aria-pressed", "false");
      expect(layout()).toHaveAttribute("data-theme", "light");

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-pressed", "true");
      expect(layout()).toHaveAttribute("data-theme", "dark");
      expect(screen.getByText("Página dashboard").closest("[data-theme]")).toHaveAttribute("data-theme", "dark");

      fireEvent.click(toggle);
      expect(layout()).toHaveAttribute("data-theme", "light");
    });

    it("a escolha fica salva e volta ao abrir de novo", () => {
      const { unmount } = renderWithTheme();
      fireEvent.click(screen.getByRole("button", { name: "Modo escuro" }));
      expect(localStorage.getItem("admin-theme")).toBe("dark");

      unmount();
      renderWithTheme();

      expect(screen.getByRole("button", { name: "Modo escuro" })).toHaveAttribute("aria-pressed", "true");
      expect(layout()).toHaveAttribute("data-theme", "dark");
    });

    it("aproveita a escolha salva pelo antigo botão da aba Gráficos", () => {
      localStorage.setItem("admin-charts-theme", "dark");

      renderWithTheme();

      expect(layout()).toHaveAttribute("data-theme", "dark");
      expect(localStorage.getItem("admin-theme")).toBe("dark");
    });

    it("sem o provider (componente solto), fica no claro e o botão não quebra", () => {
      renderAt("/admin");

      fireEvent.click(screen.getByRole("button", { name: "Modo escuro" }));
      expect(layout()).toHaveAttribute("data-theme", "light");
    });
  });
});
