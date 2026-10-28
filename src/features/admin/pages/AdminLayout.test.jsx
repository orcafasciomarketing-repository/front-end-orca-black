import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import AdminLayout from "./AdminLayout";

const renderAt = (path) => {
  const router = createMemoryRouter(
    [
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: <p>Página dashboard</p> },
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
});
