import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "../features/auth/context/AuthContext";
import AdminLayout from "../features/admin/pages/AdminLayout";
import RestrictedRoute from "./RestrictedRoute";

const renderAt = (path, role) => {
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <RestrictedRoute allow="canSeeAdmin" redirectTo="/minha-area" />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <p>Página dashboard</p> },
              {
                element: <RestrictedRoute allow="canSeeGoals" />,
                children: [
                  { path: "metas", element: <p>Página cadastro de metas</p> },
                  { path: "metas/vendedores", element: <p>Página metas por vendedor</p> },
                ],
              },
            ],
          },
        ],
      },
      { path: "/minha-area", element: <p>Página minha área</p> },
    ],
    { initialEntries: [path] },
  );

  return render(
    <AuthContext value={{ state: { user: { _id: "1", email: "x@teste.com", role }, token: "t" } }}>
      <RouterProvider router={router} />
    </AuthContext>,
  );
};

const menuItems = () =>
  screen
    .getByRole("navigation", { name: "Menu principal" })
    .querySelectorAll("a")
    .values()
    .map((link) => link.textContent)
    .toArray();

describe("Telas de metas nas rotas (fase de teste: só master e admin)", () => {
  for (const role of ["master", "admin", undefined]) {
    it(`${role ?? "usuário antigo sem perfil"} abre as duas telas e vê os dois itens no menu`, () => {
      renderAt("/admin/metas", role);
      expect(screen.getByText("Página cadastro de metas")).toBeInTheDocument();
      expect(menuItems()).toEqual(expect.arrayContaining(["Cadastro de metas", "Painel de metas"]));
    });
  }

  it("as duas telas têm endereços separados", () => {
    renderAt("/admin/metas/vendedores", "admin");
    expect(screen.getByText("Página metas por vendedor")).toBeInTheDocument();
    expect(screen.queryByText("Página cadastro de metas")).not.toBeInTheDocument();
  });

  for (const role of ["b2b", "b2g"]) {
    it(`${role} não vê os itens e, pelo endereço, volta para o dashboard`, () => {
      renderAt("/admin/metas/vendedores", role);
      expect(screen.getByText("Página dashboard")).toBeInTheDocument();
      expect(menuItems()).not.toContain("Cadastro de metas");
      expect(menuItems()).not.toContain("Painel de metas");
    });
  }

  for (const role of ["vendor", "sdr"]) {
    it(`${role} não entra nas telas de metas`, () => {
      renderAt("/admin/metas", role);
      expect(screen.getByText("Página minha área")).toBeInTheDocument();
    });
  }
});
