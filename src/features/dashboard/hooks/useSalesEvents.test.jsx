import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeToSalesEvents } from "../api/dashboardApi";
import { useSalesEvents } from "./useSalesEvents";

vi.mock("../api/dashboardApi", () => ({
  subscribeToSalesEvents: vi.fn(),
}));

const newSale = { id: "sale-1", seller: { name: "Bruno" }, assists: [] };

function renderUseSalesEvents(onNewSale = vi.fn()) {
  const queryClient = new QueryClient();
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  const result = renderHook(({ callback }) => useSalesEvents(callback), {
    wrapper,
    initialProps: { callback: onNewSale },
  });

  return { ...result, invalidateSpy, onNewSale };
}

describe("useSalesEvents", () => {
  const unsubscribe = vi.fn();
  let emitEvent;

  beforeEach(() => {
    vi.clearAllMocks();
    subscribeToSalesEvents.mockImplementation((onEvent) => {
      emitEvent = onEvent;
      return unsubscribe;
    });
  });

  it("abre uma conexão só ao montar", () => {
    renderUseSalesEvents();

    expect(subscribeToSalesEvents).toHaveBeenCalledTimes(1);
  });

  it("a cada evento busca de novo placares, rankings e a meta", () => {
    const { invalidateSpy } = renderUseSalesEvents();

    emitEvent(null);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["scoreboard"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["ranking"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["goal"] });
  });

  it("repassa a venda nova para o callback", () => {
    const { onNewSale } = renderUseSalesEvents();

    emitEvent(newSale);

    expect(onNewSale).toHaveBeenCalledWith(newSale);
  });

  it("não chama o callback em evento que não é venda nova", () => {
    const { onNewSale } = renderUseSalesEvents();

    emitEvent(null);

    expect(onNewSale).not.toHaveBeenCalled();
  });

  it("usa sempre o callback mais recente sem abrir outra conexão", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderUseSalesEvents(first);

    rerender({ callback: second });
    emitEvent(newSale);

    expect(subscribeToSalesEvents).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(newSale);
  });

  it("fecha a conexão ao desmontar", () => {
    const { unmount } = renderUseSalesEvents();

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
