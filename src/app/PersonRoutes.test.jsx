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
              { path: "graficos", element: <p>Página gráficos</p> },
            ],
          },
        ],
      },
      {
        path: "/minha-area",
        element: <RestrictedRoute allow="isPerson" />,
        children: [{ element: <AdminLayout />, children: [{ index: true, element: <p>Página minha área</p> }] }],
      },
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

describe("Área do colaborador nas rotas", () => {
  for (const role of ["vendor", "sdr"]) {
    it(`${role} abrindo o admin pelo endereço vai para a própria área, com só "Minha área" no menu`, () => {
      renderAt("/admin/graficos", role);

      expect(screen.getByText("Página minha área")).toBeInTheDocument();
      expect(screen.queryByText("Página gráficos")).not.toBeInTheDocument();
      expect(menuItems()).toEqual(["Minha área"]);
    });
  }

  for (const role of ["master", "admin", "b2b", "b2g", undefined]) {
    it(`${role ?? "usuário antigo sem perfil"} continua no admin e não entra na área do colaborador`, () => {
      renderAt("/minha-area", role);

      expect(screen.getByText("Página dashboard")).toBeInTheDocument();
      expect(screen.queryByText("Página minha área")).not.toBeInTheDocument();
      expect(menuItems()).toContain("Dashboard");
      expect(menuItems()).not.toContain("Minha área");
    });
  }
});
