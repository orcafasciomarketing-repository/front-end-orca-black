import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SalePopup, { SALE_BILLBOARD_DURATION } from "./SalePopup";

const makeItem = (key, sale = {}) => ({
  key,
  sale: {
    id: `sale-${key}`,
    type: "sales",
    seller: { name: "Bruno", job: "Vendedor", imageUrl: "http://localhost/bruno.png" },
    assist: { name: "Juliana", job: "SDR", imageUrl: "http://localhost/juliana.png" },
    ...sale,
  },
});

const isVisible = () => screen.getByTestId("sale-popup").getAttribute("aria-hidden") === "false";

const advance = (ms) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("SalePopup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fica escondido sem venda", () => {
    render(<SalePopup item={null} videoUrl={null} onFinish={vi.fn()} />);

    expect(isVisible()).toBe(false);
    expect(screen.queryByText("+1 Venda")).not.toBeInTheDocument();
  });

  it("sem vídeo mostra o outdoor direto, com vendedor, cargo e foto", () => {
    render(<SalePopup item={makeItem(1)} videoUrl={null} onFinish={vi.fn()} />);

    expect(isVisible()).toBe(true);
    expect(screen.queryByTestId("sale-video")).not.toBeInTheDocument();
    expect(screen.getByText("Bruno")).toBeInTheDocument();
    expect(screen.getByText("(Vendedor)")).toBeInTheDocument();
    expect(screen.getByText("+1 Venda")).toBeInTheDocument();
    expect(screen.getByAltText("Bruno")).toHaveAttribute("src", "http://localhost/bruno.png");
  });

  it("mostra +1 Renovação quando a venda é farmer", () => {
    render(<SalePopup item={makeItem(1, { type: "farm" })} videoUrl={null} onFinish={vi.fn()} />);

    expect(screen.getByText("+1 Renovação")).toBeInTheDocument();
  });

  it("mostra a assistência só quando a venda tem passagem", () => {
    const { rerender } = render(<SalePopup item={makeItem(1)} videoUrl={null} onFinish={vi.fn()} />);

    expect(screen.getByText("Assistência")).toBeInTheDocument();
    expect(screen.getByText("Juliana")).toBeInTheDocument();
    expect(screen.getByText("(SDR)")).toBeInTheDocument();

    rerender(<SalePopup item={makeItem(2, { assist: null })} videoUrl={null} onFinish={vi.fn()} />);

    expect(screen.queryByText("Assistência")).not.toBeInTheDocument();
  });

  it("avisa que terminou 10 segundos depois de o outdoor aparecer", () => {
    const onFinish = vi.fn();
    render(<SalePopup item={makeItem(1)} videoUrl={null} onFinish={onFinish} />);

    advance(SALE_BILLBOARD_DURATION - 1);
    expect(onFinish).not.toHaveBeenCalled();

    advance(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("com vídeo mostra o vídeo primeiro e o outdoor só quando ele termina", () => {
    const onFinish = vi.fn();
    render(<SalePopup item={makeItem(1)} videoUrl="/sale-video.mp4" onFinish={onFinish} />);

    const video = screen.getByTestId("sale-video");
    expect(video).toHaveAttribute("src", "/sale-video.mp4");
    expect(screen.queryByText("+1 Venda")).not.toBeInTheDocument();

    advance(SALE_BILLBOARD_DURATION * 3);
    expect(onFinish).not.toHaveBeenCalled();

    fireEvent.ended(video);
    expect(screen.queryByTestId("sale-video")).not.toBeInTheDocument();
    expect(screen.getByText("+1 Venda")).toBeInTheDocument();

    advance(SALE_BILLBOARD_DURATION);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("se o vídeo falhar, pula direto para o outdoor", () => {
    render(<SalePopup item={makeItem(1)} videoUrl="/sale-video.mp4" onFinish={vi.fn()} />);

    fireEvent.error(screen.getByTestId("sale-video"));

    expect(screen.getByText("+1 Venda")).toBeInTheDocument();
  });

  it("cada venda nova da fila começa pelo vídeo de novo", () => {
    const { rerender } = render(<SalePopup item={makeItem(1)} videoUrl="/sale-video.mp4" onFinish={vi.fn()} />);

    fireEvent.ended(screen.getByTestId("sale-video"));
    rerender(<SalePopup item={makeItem(2)} videoUrl="/sale-video.mp4" onFinish={vi.fn()} />);

    expect(screen.getByTestId("sale-video")).toBeInTheDocument();
  });

  it("ao sair continua com a última venda para o fade, mas escondido e sem chamar onFinish de novo", () => {
    const onFinish = vi.fn();
    const item = makeItem(1);
    const { rerender } = render(<SalePopup item={item} videoUrl={null} onFinish={onFinish} />);

    rerender(<SalePopup item={null} videoUrl={null} onFinish={onFinish} />);
    advance(SALE_BILLBOARD_DURATION);

    expect(isVisible()).toBe(false);
    expect(screen.getByText("Bruno")).toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });
});
