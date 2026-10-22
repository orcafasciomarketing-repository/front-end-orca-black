import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reportError } from "../../errorLogger";
import ErrorBoundary from "./ErrorBoundary";

vi.mock("../../errorLogger", () => ({
  reportError: vi.fn(),
}));

const state = { shouldThrow: true };

function Broken() {
  if (state.shouldThrow) {
    throw new Error("Falha ao carregar");
  }

  return <p>Conteúdo ok</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.shouldThrow = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mostra o conteúdo quando não há erro", () => {
    state.shouldThrow = false;

    render(
      <ErrorBoundary location="Tela X">
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Conteúdo ok")).toBeInTheDocument();
  });

  it("troca o conteúdo pela tela de erro com título, mensagem, local e componente", () => {
    render(
      <ErrorBoundary location="Tela X">
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Ops, algo deu errado")).toBeInTheDocument();
    expect(screen.getByText("Falha ao carregar")).toBeInTheDocument();
    expect(screen.getByText("Tela X")).toBeInTheDocument();
    expect(screen.getByText("Componente").nextSibling).toHaveTextContent(/Broken/);
  });

  it("registra o erro com o local e a pilha de componentes", () => {
    render(
      <ErrorBoundary location="Tela X">
        <Broken />
      </ErrorBoundary>,
    );

    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Falha ao carregar" }),
      expect.objectContaining({ location: "Tela X", componentStack: expect.stringContaining("Broken") }),
    );
  });

  it("tentar novamente renderiza o conteúdo de novo", () => {
    render(
      <ErrorBoundary location="Tela X">
        <Broken />
      </ErrorBoundary>,
    );

    state.shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(screen.getByText("Conteúdo ok")).toBeInTheDocument();
  });

  it("aplica a classe extra na tela de erro", () => {
    render(
      <ErrorBoundary location="Tela X" className="por-cima">
        <Broken />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveClass("por-cima");
  });
});
