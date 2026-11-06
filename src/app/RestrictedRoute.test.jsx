import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "../features/auth/context/AuthContext";
import RestrictedRoute from "./RestrictedRoute";

const renderAt = (path, role) => {
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        children: [
          { index: true, element: <p>Página dashboard</p> },
          { path: "graficos", element: <p>Página gráficos</p> },
          {
            element: <RestrictedRoute allow="isMaster" />,
            children: [
              { path: "importacao", element: <p>Página importação</p> },
              { path: "erros", element: <p>Página erros</p> },
            ],
          },
          {
            element: <RestrictedRoute allow="canSeeUsers" />,
            children: [{ path: "usuarios", element: <p>Página usuários</p> }],
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

// [rota, página, perfis que abrem]
const PAGES = [
  ["/admin/importacao", "Página importação", ["master"]],
  ["/admin/erros", "Página erros", ["master"]],
  ["/admin/usuarios", "Página usuários", ["master", "admin"]],
  ["/admin/graficos", "Página gráficos", ["master", "admin", "b2b", "b2g"]],
];

describe("RestrictedRoute", () => {
  for (const [path, page, allowed] of PAGES) {
    for (const role of ["master", "admin", "b2b", "b2g"]) {
      if (allowed.includes(role)) {
        it(`${role} abre ${path}`, () => {
          renderAt(path, role);

          expect(screen.getByText(page)).toBeInTheDocument();
        });
      } else {
        it(`${role} abrindo ${path} pelo endereço volta para o dashboard`, () => {
          renderAt(path, role);

          expect(screen.getByText("Página dashboard")).toBeInTheDocument();
          expect(screen.queryByText(page)).not.toBeInTheDocument();
        });
      }
    }
  }
});
