import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reportError } from "../shared/errorLogger";
import RouteErrorScreen from "./RouteErrorScreen";

vi.mock("../shared/errorLogger", () => ({
  reportError: vi.fn(),
}));

function Broken() {
  throw new Error("Página quebrou");
}

const renderAt = (path) => {
  const router = createMemoryRouter(
    [{ path: "/quebrada", element: <Broken />, errorElement: <RouteErrorScreen /> }],
    { initialEntries: [path] },
  );

  return render(<RouterProvider router={router} />);
};

describe("RouteErrorScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mostra a tela de erro com a rota onde aconteceu e registra o log", () => {
    renderAt("/quebrada");

    expect(screen.getByText("Ops, algo deu errado")).toBeInTheDocument();
    expect(screen.getByText("Página quebrou")).toBeInTheDocument();
    expect(screen.getByText("Rota /quebrada")).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Página quebrou" }),
      { location: "Rota /quebrada" },
    );
  });

  it("rota que não existe mostra 404 sem registrar log", () => {
    const router = createMemoryRouter([{ path: "/", element: <p>home</p>, errorElement: <RouteErrorScreen /> }], {
      initialEntries: ["/nao-existe"],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByText("404 Not Found")).toBeInTheDocument();
    expect(reportError).not.toHaveBeenCalled();
  });
});
