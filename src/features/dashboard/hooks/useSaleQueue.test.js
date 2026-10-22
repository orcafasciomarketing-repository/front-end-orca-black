import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSaleQueue } from "./useSaleQueue";

const sale = (id) => ({ id, seller: { name: id }, assist: null });

describe("useSaleQueue", () => {
  it("começa vazia", () => {
    const { result } = renderHook(() => useSaleQueue());

    expect(result.current.currentItem).toBeNull();
  });

  it("a primeira venda que entra é a que está na tela", () => {
    const { result } = renderHook(() => useSaleQueue());

    act(() => result.current.enqueueSale(sale("a")));

    expect(result.current.currentItem.sale.id).toBe("a");
  });

  it("tira as vendas na ordem de chegada (FIFO)", () => {
    const { result } = renderHook(() => useSaleQueue());

    act(() => {
      result.current.enqueueSale(sale("a"));
      result.current.enqueueSale(sale("b"));
      result.current.enqueueSale(sale("c"));
    });

    expect(result.current.currentItem.sale.id).toBe("a");
    act(() => result.current.dequeueSale());
    expect(result.current.currentItem.sale.id).toBe("b");
    act(() => result.current.dequeueSale());
    expect(result.current.currentItem.sale.id).toBe("c");
    act(() => result.current.dequeueSale());
    expect(result.current.currentItem).toBeNull();
  });

  it("uma venda nova não muda a venda que está na tela", () => {
    const { result } = renderHook(() => useSaleQueue());

    act(() => result.current.enqueueSale(sale("a")));
    const current = result.current.currentItem;
    act(() => result.current.enqueueSale(sale("b")));

    expect(result.current.currentItem).toBe(current);
  });

  it("cada entrada ganha uma key própria, mesmo com a mesma venda", () => {
    const { result } = renderHook(() => useSaleQueue());
    const repeated = sale("a");

    act(() => {
      result.current.enqueueSale(repeated);
      result.current.enqueueSale(repeated);
    });
    const firstKey = result.current.currentItem.key;
    act(() => result.current.dequeueSale());

    expect(result.current.currentItem.sale).toBe(repeated);
    expect(result.current.currentItem.key).not.toBe(firstKey);
  });
});
