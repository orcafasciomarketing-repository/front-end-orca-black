import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TierProgressCard from "./TierProgressCard";

const text = (element) => element.textContent.replace(/ /g, " ");

const progress = {
  realized: 1200,
  tiers: { goal: 1000, super: 1500, black: 3000 },
  reached: ["goal"],
  current: "super",
  available: ["goal", "super", "black"],
};

const forecast = {
  scenarios: { realistic: 1800 },
  tiers: {
    goal: { target: 1000, requiredPace: 0, probability: 100 },
    super: { target: 1500, requiredPace: 30, probability: 72.5 },
    black: { target: 3000, requiredPace: 180, probability: 3.1 },
  },
};

describe("TierProgressCard", () => {
  it("faixa batida mostra o que passou dela", () => {
    render(<TierProgressCard tier="goal" progress={progress} forecast={forecast} />);
    const card = screen.getByRole("region", { name: "Meta" });

    expect(text(card)).toMatch(/Batida, com R\$ 200,00 além dela/);
    expect(screen.getByRole("progressbar", { name: "Progresso da Meta" })).toHaveAttribute("aria-valuenow", "100");
  });

  it("faixa atual: quanto falta, quanto precisa por dia, chance e previsão realista", () => {
    render(<TierProgressCard tier="super" progress={progress} forecast={forecast} />);
    const card = text(screen.getByRole("region", { name: "Super meta" }));

    expect(card).toMatch(/Buscando agora/);
    expect(card).toMatch(/Faltam R\$ 300,00/);
    expect(card).toMatch(/Precisa por diaR\$ 30,00/);
    expect(card).toMatch(/Chance de bater72,5%/);
    expect(card).toMatch(/Bate \(\+R\$ 300,00\)/);
  });

  it("faixa seguinte e previsão que não chega; sem forecast não mostra os números", () => {
    const { unmount } = render(<TierProgressCard tier="black" progress={progress} forecast={forecast} />);
    const card = text(screen.getByRole("region", { name: "Meta black" }));
    expect(card).toMatch(/Próxima faixa/);
    expect(card).toMatch(/Faltariam R\$ 1\.200,00/);
    unmount();

    render(<TierProgressCard tier="black" progress={progress} period="semana atual" />);
    expect(screen.queryByText("Chance de bater")).not.toBeInTheDocument();
  });
});
