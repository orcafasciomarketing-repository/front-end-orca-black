import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeToSalesEvents } from "../../../dashboard/api/dashboardApi";
import SaleToasts, { TOAST_DURATION_MS } from "./SaleToasts";

vi.mock("../../../dashboard/api/dashboardApi", () => ({
  subscribeToSalesEvents: vi.fn(),
}));

const newSale = {
  id: "s1",
  type: "sales",
  seller: { name: "Gustavo Rocha", job: "B2G Sales", imageUrl: null },
  assists: [{ name: "Caio Martins" }],
};

describe("SaleToasts (tempo real no admin)", () => {
  let emit;
  let queryClient;
  let unsubscribe;

  beforeEach(() => {
    vi.useFakeTimers();
    unsubscribe = vi.fn();
    subscribeToSalesEvents.mockImplementation((onEvent) => {
      emit = onEvent;
      return unsubscribe;
    });
    vi.stubGlobal("EventSource", class {});
    queryClient = new QueryClient();
    vi.spyOn(queryClient, "invalidateQueries");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const renderToasts = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <SaleToasts />
      </QueryClientProvider>,
    );

  it("venda nova: mostra o aviso e atualiza só os dados do admin", () => {
    renderToasts();

    act(() => emit(newSale));

    expect(screen.getByText("Nova venda")).toBeInTheDocument();
    expect(screen.getByText("Gustavo Rocha · B2G Sales")).toBeInTheDocument();
    expect(screen.getByText("Passagem: Caio Martins")).toBeInTheDocument();
    expect(document.querySelector("[data-initials='GR']")).toBeInTheDocument();

    const { predicate } = queryClient.invalidateQueries.mock.calls[0][0];
    expect(predicate({ queryKey: ["admin-sales", "all"] })).toBe(true);
    expect(predicate({ queryKey: ["admin-goal"] })).toBe(true);
    expect(predicate({ queryKey: ["error-logs"] })).toBe(false);
  });

  it("renovação tem o próprio título; venda alterada só atualiza, sem aviso", () => {
    renderToasts();

    act(() => emit(null));
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Nova/)).not.toBeInTheDocument();

    act(() => emit({ ...newSale, type: "farm" }));
    expect(screen.getByText("Nova renovação")).toBeInTheDocument();
  });

  it("o aviso fecha no botão ou sozinho depois de alguns segundos, e mostra no máximo 3", () => {
    renderToasts();

    act(() => emit(newSale));
    fireEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(screen.queryByText("Nova venda")).not.toBeInTheDocument();

    act(() => {
      ["a", "b", "c", "d"].forEach((id) => emit({ ...newSale, id }));
    });
    expect(screen.getAllByText("Nova venda")).toHaveLength(3);

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS));
    expect(screen.queryByText("Nova venda")).not.toBeInTheDocument();
  });

  it("o perfil da área do colaborador não é recarregado a cada venda (não muda com vendas)", () => {
    renderToasts();

    act(() => emit(newSale));

    const { predicate } = queryClient.invalidateQueries.mock.calls[0][0];
    expect(predicate({ queryKey: ["admin-me"] })).toBe(false);
    expect(predicate({ queryKey: ["admin-me-sales"] })).toBe(true);
    expect(predicate({ queryKey: ["admin-me-goals", "2026-11"] })).toBe(true);
  });

  it("com spreadMs (área do colaborador), a atualização espera um tempo sorteado, e o aviso aparece na hora", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    render(
      <QueryClientProvider client={queryClient}>
        <SaleToasts spreadMs={3000} />
      </QueryClientProvider>,
    );

    act(() => emit(newSale));
    expect(screen.getByText("Nova venda")).toBeInTheDocument();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1499));
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    vi.mocked(Math.random).mockRestore();
  });

  it("para de escutar ao sair do admin", () => {
    const { unmount } = renderToasts();

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
