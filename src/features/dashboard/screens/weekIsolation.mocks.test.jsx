import { configure, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithQuery } from "../../../test/renderWithQuery";
import AssistRankingScreen from "./AssistRankingScreen/AssistRankingScreen";
import GoalScreen from "./GoalScreen/GoalScreen";
import ScorerRankingScreen from "./ScorerRankingScreen/ScorerRankingScreen";
import TeamRankingScreen from "./TeamRankingScreen/TeamRankingScreen";

configure({ asyncUtilTimeout: 4000 });

const cardsOf = async () => within(await screen.findByRole("list")).getAllByRole("listitem");
const namesIn = (cards) => cards.map((card) => within(card).getByRole("heading").textContent);

describe("Telas das TVs com os dados falsos (quarta, 21/10/2026)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_USE_MOCKS", "true");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe("Ranking de equipes", () => {
    it("semanal: só os pontos da semana atual (Wizards 8, Orçawinx 3, Sem freio 2)", async () => {
      renderWithQuery(<TeamRankingScreen period="week" />);

      const cards = await cardsOf();
      expect(within(cards[0]).getByRole("article", { name: "Wizards of sales" })).toBeInTheDocument();
      expect(within(cards[0]).getByText("8")).toBeInTheDocument();
      expect(within(cards[1]).getByRole("article", { name: "Orçawinx" })).toBeInTheDocument();
      expect(within(cards[1]).getByText("3")).toBeInTheDocument();
      expect(within(cards[2]).getByRole("article", { name: "Sem freio" })).toBeInTheDocument();
      expect(within(cards[2]).getByText("2")).toBeInTheDocument();
    });

    it("geral acumulado: soma todas as semanas e muda o líder para Orçawinx", async () => {
      renderWithQuery(<TeamRankingScreen period="all" />);

      const cards = await cardsOf();
      expect(within(cards[0]).getByRole("article", { name: "Orçawinx" })).toBeInTheDocument();
      expect(screen.getByText("Geral acumulado")).toBeInTheDocument();
    });
  });

  describe("Ranking de artilheiros", () => {
    it("vendas semanal: Brenda e Gustavo, sem quem só vendeu na semana passada", async () => {
      renderWithQuery(<ScorerRankingScreen period="week" department="sales" />);

      const cards = await cardsOf();
      expect(namesIn(cards)).toEqual(["Brenda Lima", "Gustavo Rocha"]);
      expect(within(cards[0]).getByText("4")).toBeInTheDocument();
      expect(screen.queryByText("Karine Souza")).not.toBeInTheDocument();
      expect(screen.queryByText("Danne Costa")).not.toBeInTheDocument();
    });

    it("vendas semanal: venda cancelada não pontua (Heitor fica de fora)", async () => {
      renderWithQuery(<ScorerRankingScreen period="week" department="sales" />);

      await cardsOf();
      expect(screen.queryByText("Heitor Alves")).not.toBeInTheDocument();
    });

    it("farmer semanal: Brenda, Joice e Marcelo; a Karine (farmer da semana passada) não aparece", async () => {
      renderWithQuery(<ScorerRankingScreen period="week" department="farm" />);

      const cards = await cardsOf();
      expect(namesIn(cards).sort()).toEqual(["Brenda Lima", "Joice Pereira", "Marcelo Dias"]);
      expect(screen.queryByText("Karine Souza")).not.toBeInTheDocument();
    });

    it("vendas geral: Gustavo lidera somando a semana atual e a passada", async () => {
      renderWithQuery(<ScorerRankingScreen period="all" department="sales" />);

      const cards = await cardsOf();
      expect(namesIn(cards)[0]).toBe("Gustavo Rocha");
      expect(within(cards[0]).getByText("6")).toBeInTheDocument();
    });

    it("farmer geral: inclui a Karine da semana passada", async () => {
      renderWithQuery(<ScorerRankingScreen period="all" department="farm" />);

      await cardsOf();
      expect(screen.getByText("Farmer Geral")).toBeInTheDocument();
    });
  });

  describe("Ranking de assistências", () => {
    it("geral: Caio lidera com 3 passagens", async () => {
      renderWithQuery(<AssistRankingScreen period="all" />);

      const cards = await cardsOf();
      expect(namesIn(cards)[0]).toBe("Caio Martins");
      expect(within(cards[0]).getByText("3")).toBeInTheDocument();
    });

    it("semanal: só as passagens da semana atual (Izabel, Caio e Julia com 1)", async () => {
      renderWithQuery(<AssistRankingScreen period="week" />);

      const cards = await cardsOf();
      expect(namesIn(cards).sort()).toEqual(["Caio Martins", "Izabel Ramos", "Julia Tomaz"]);
    });
  });

  describe("Meta Black", () => {
    it("soma as vendas ativas de todas as semanas: R$ 212.000,00 de R$ 3.000.000,00", async () => {
      renderWithQuery(<GoalScreen />);

      expect(await screen.findByText(/212\.000,00/)).toBeInTheDocument();
      expect(screen.getByText(/3\.000\.000,00/)).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "7.07");
    });
  });
});
