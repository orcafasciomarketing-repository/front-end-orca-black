import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reportError } from "../../../shared/errorLogger";
import { useSalesEvents } from "../hooks/useSalesEvents";
import DashboardPage from "./DashboardPage";

const mocks = vi.hoisted(() => ({ goalError: null }));

vi.mock("../screens/GoalScreen/GoalScreen", () => ({
  default: () => {
    if (mocks.goalError) {
      throw mocks.goalError;
    }

    return <p>Tela meta</p>;
  },
}));
vi.mock("../screens/TeamRankingScreen/TeamRankingScreen", () => ({
  default: ({ period }) => <p>Tela ranking {period}</p>,
}));
vi.mock("../screens/ScorerRankingScreen/ScorerRankingScreen", () => ({
  default: ({ period, department }) => (
    <p>
      Tela artilheiros {department} {period}
    </p>
  ),
}));
vi.mock("../screens/AssistRankingScreen/AssistRankingScreen", () => ({
  default: ({ period }) => <p>Tela assistências {period}</p>,
}));
vi.mock("../hooks/useSalesEvents", () => ({
  useSalesEvents: vi.fn(),
}));
vi.mock("../hooks/useSaleVideo", () => ({
  useSaleVideo: () => ({ videoUrl: null }),
}));
vi.mock("../../../shared/errorLogger", () => ({
  reportError: vi.fn(),
}));

const makeSale = (id, name) => ({ id, type: "sales", seller: { name }, assist: null });

const advance = (ms) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const emitNewSale = (sale) =>
  act(() => {
    useSalesEvents.mock.lastCall[0](sale);
  });

const isPopupVisible = () => screen.getByTestId("sale-popup").getAttribute("aria-hidden") === "false";

const ROTATION_INTERVAL = 15 * 1000;

const SLIDE_IDS = [
  "goal",
  "team-ranking-week",
  "team-ranking-all",
  "scorer-farm-week",
  "scorer-sales-week",
  "scorer-farm-all",
  "scorer-sales-all",
  "assist-ranking",
];

const visibleSlides = () =>
  SLIDE_IDS.filter((id) => screen.getByTestId(`slide-${id}`).getAttribute("aria-hidden") === "false");

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("monta todas as telas e começa pela primeira", () => {
    render(<DashboardPage />);

    expect(screen.getByText("Tela meta")).toBeInTheDocument();
    expect(screen.getByText("Tela ranking week")).toBeInTheDocument();
    expect(screen.getByText("Tela ranking all")).toBeInTheDocument();
    expect(screen.getByText("Tela artilheiros farm week")).toBeInTheDocument();
    expect(screen.getByText("Tela artilheiros sales week")).toBeInTheDocument();
    expect(screen.getByText("Tela artilheiros farm all")).toBeInTheDocument();
    expect(screen.getByText("Tela artilheiros sales all")).toBeInTheDocument();
    expect(screen.getByText("Tela assistências all")).toBeInTheDocument();
    expect(visibleSlides()).toEqual(["goal"]);
  });

  it("não troca de tela antes dos 15 segundos", () => {
    render(<DashboardPage />);

    act(() => {
      vi.advanceTimersByTime(ROTATION_INTERVAL - 1);
    });

    expect(visibleSlides()).toEqual(["goal"]);
  });

  it("passa pelas telas na ordem, a cada 15 segundos, e volta para a primeira no fim", () => {
    render(<DashboardPage />);
    const order = [...SLIDE_IDS.slice(1), "goal"];

    for (const id of order) {
      act(() => {
        vi.advanceTimersByTime(ROTATION_INTERVAL);
      });
      expect(visibleSlides()).toEqual([id]);
    }
  });

  it("para o timer quando sai da página", () => {
    const { unmount } = render(<DashboardPage />);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("mostra o popup quando chega uma venda nova e esconde depois de 10 segundos", () => {
    render(<DashboardPage />);

    expect(isPopupVisible()).toBe(false);

    emitNewSale(makeSale("s1", "Bruno"));
    expect(isPopupVisible()).toBe(true);
    expect(screen.getByText("Bruno")).toBeInTheDocument();

    advance(10 * 1000);
    expect(isPopupVisible()).toBe(false);
  });

  it("mostra vendas que chegam juntas uma de cada vez, na ordem", () => {
    render(<DashboardPage />);

    emitNewSale(makeSale("s1", "Bruno"));
    emitNewSale(makeSale("s2", "Carla"));
    expect(screen.getByText("Bruno")).toBeInTheDocument();

    advance(10 * 1000);
    expect(screen.getByText("Carla")).toBeInTheDocument();
    expect(isPopupVisible()).toBe(true);

    advance(10 * 1000);
    expect(isPopupVisible()).toBe(false);
  });

  it("pausa o carrossel enquanto o popup está na tela e retoma depois", () => {
    render(<DashboardPage />);

    emitNewSale(makeSale("s1", "Bruno"));
    emitNewSale(makeSale("s2", "Carla"));

    advance(10 * 1000);
    advance(5 * 1000);
    expect(screen.getByText("Carla")).toBeInTheDocument();
    expect(isPopupVisible()).toBe(true);
    expect(visibleSlides()).toEqual(["goal"]);

    advance(5 * 1000);
    expect(isPopupVisible()).toBe(false);
    expect(visibleSlides()).toEqual(["goal"]);

    advance(ROTATION_INTERVAL);
    expect(visibleSlides()).toEqual(["team-ranking-week"]);
  });

  it("um erro numa tela mostra a tela de erro só nela e registra o log", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.goalError = new Error("Falha ao buscar a meta");

    render(<DashboardPage />);

    expect(screen.getByText("Ops, algo deu errado")).toBeInTheDocument();
    expect(screen.getByText("Falha ao buscar a meta")).toBeInTheDocument();
    expect(screen.getByText('Dashboard › tela "goal"')).toBeInTheDocument();
    expect(screen.getByText("Tela ranking week")).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledWith(
      mocks.goalError,
      expect.objectContaining({ location: 'Dashboard › tela "goal"' }),
    );

    mocks.goalError = null;
    vi.mocked(console.error).mockRestore();
  });
});
