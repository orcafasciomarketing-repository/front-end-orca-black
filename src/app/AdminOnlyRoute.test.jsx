import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "../features/auth/context/AuthContext";
import AdminOnlyRoute from "./AdminOnlyRoute";

const renderAt = (path, role) => {
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        children: [
          { index: true, element: <p>Página dashboard</p> },
          { path: "graficos", element: <p>Página gráficos</p> },
          {
            element: <AdminOnlyRoute />,
            children: [
              { path: "importacao", element: <p>Página importação</p> },
              { path: "erros", element: <p>Página erros</p> },
              { path: "usuarios", element: <p>Página usuários</p> },
            ],
          },
        ],
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

const ADMIN_PAGES = [
  ["/admin/importacao", "Página importação"],
  ["/admin/erros", "Página erros"],
  ["/admin/usuarios", "Página usuários"],
];

describe("AdminOnlyRoute", () => {
  for (const [path, page] of ADMIN_PAGES) {
    it(`admin abre ${path}`, () => {
      renderAt(path, "admin");

      expect(screen.getByText(page)).toBeInTheDocument();
    });

    for (const role of ["b2b", "b2g"]) {
      it(`${role} abrindo ${path} pelo endereço volta para o dashboard`, () => {
        renderAt(path, role);

        expect(screen.getByText("Página dashboard")).toBeInTheDocument();
        expect(screen.queryByText(page)).not.toBeInTheDocument();
      });
    }
  }

  it("b2b continua abrindo Gráficos (não é tela só do admin)", () => {
    renderAt("/admin/graficos", "b2b");

    expect(screen.getByText("Página gráficos")).toBeInTheDocument();
  });
});
