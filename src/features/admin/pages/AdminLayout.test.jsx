import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
  beforeEach(() => window.localStorage.clear());

  const openAdminMenu = () => fireEvent.click(screen.getByRole("button", { name: "Administração" }));

  it("mostra o menu com Dashboard, abre no dashboard e as telas de administração ficam na engrenagem", () => {
    renderAt("/admin");

    const menu = screen.getByRole("navigation", { name: "Menu principal" });
    expect(menu).toHaveTextContent("Dashboard");
    expect(menu).not.toHaveTextContent("Erros");
    expect(screen.getByText("Página dashboard")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");

    openAdminMenu();
    expect(screen.getByRole("menu", { name: "Administração" })).toHaveTextContent("Erros");
  });

  it("troca para a aba Erros pela engrenagem, sem recarregar a página, e o menu da engrenagem fecha", () => {
    renderAt("/admin");

    openAdminMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Erros" }));

    expect(screen.getByText("Página erros")).toBeInTheDocument();
    expect(screen.queryByText("Página dashboard")).not.toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("o menu da engrenagem fecha no Esc e clicando fora", () => {
    renderAt("/admin");

    openAdminMenu();
    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    openAdminMenu();
    fireEvent.mouseDown(screen.getByText("Página dashboard"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
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

  it("as seções Campanha e Metas do mês abrem e fecham, e a escolha fica salva", () => {
    renderAt("/admin");

    const campaign = screen.getByRole("button", { name: "Campanha" });
    expect(campaign).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(campaign);

    expect(campaign).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Gráficos" })).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("admin-menu-sections"))).toEqual({ campanha: false });

    fireEvent.click(campaign);
    expect(screen.getByRole("link", { name: "Gráficos" })).toBeInTheDocument();
  });

  describe("perfis", () => {
    const menuLinks = () =>
      [...screen.getByRole("navigation", { name: "Menu principal" }).querySelectorAll("a")].map(
        (link) => link.textContent,
      );
    const adminMenuItems = () => {
      fireEvent.click(screen.getByRole("button", { name: "Administração" }));
      return screen.getAllByRole("menuitem").map((item) => item.textContent);
    };

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

    const FULL_MENU = [
      "Dashboard",
      "Gráficos",
      "Previsão",
      "Prêmios",
      "Relatórios",
      "Painel de metas",
      "Cadastro de metas",
      "Relatórios",
    ];

    it("master vê Campanha e Metas do mês, e na engrenagem campanhas, Importação, Erros e Usuários", () => {
      renderAs("master");

      expect(screen.getAllByRole("button", { expanded: true }).map((button) => button.textContent)).toEqual([
        "Campanha",
        "Metas do mês",
      ]);
      expect(menuLinks()).toEqual(FULL_MENU);
      expect(adminMenuItems()).toEqual(["Cadastro de campanhas", "Importação", "Erros", "Usuários"]);
    });

    it("admin vê o mesmo menu; na engrenagem, campanhas e Usuários, sem Importação nem Erros", () => {
      renderAs("admin");

      expect(menuLinks()).toEqual(FULL_MENU);
      expect(adminMenuItems()).toEqual(["Cadastro de campanhas", "Usuários"]);
    });

    it("sem perfil (backend antigo) continua vendo tudo", () => {
      renderAs(undefined);

      expect(menuLinks()).toEqual(FULL_MENU);
      expect(adminMenuItems()).toEqual(["Cadastro de campanhas", "Importação", "Erros", "Usuários"]);
    });

    for (const role of ["b2b", "b2g"]) {
      it(`${role} só vê a Campanha (com Relatórios), sem Metas nem engrenagem`, () => {
        renderAs(role);

        expect(menuLinks()).toEqual(["Dashboard", "Gráficos", "Previsão", "Prêmios", "Relatórios"]);
        expect(screen.queryByRole("button", { name: "Administração" })).not.toBeInTheDocument();
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
