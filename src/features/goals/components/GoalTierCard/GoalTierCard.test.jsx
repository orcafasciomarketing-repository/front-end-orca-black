import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import GoalTierCard from "./GoalTierCard";
import { paceOf, tierProgress, tiersOf } from "../../utils/goalMath";

const progressOf = (realized) => ({
  ...tierProgress(realized, tiersOf(1000, 120, 150)),
  pace: paceOf({ realized, goal: 1000, start: "2026-11-02", end: "2026-11-08", today: "2026-11-05" }),
});

const textOf = (element) => element.textContent.replace(/ /g, " ");

describe("GoalTierCard", () => {
  it("mostra só a faixa atual: antes de bater a Meta, a Meta", () => {
    render(<GoalTierCard title="Mês" progress={progressOf(400)} />);

    const card = screen.getByRole("region", { name: "Mês" });
    expect(textOf(card)).toMatch(/Meta/);
    expect(textOf(card)).toMatch(/R\$ 400,00de R\$ 1\.000,00/);
    expect(textOf(card)).toMatch(/Faltam R\$ 600,00 para a Meta/);
    expect(screen.queryByText(/Super meta/)).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progresso da Meta" })).toHaveAttribute("aria-valuenow", "40");
  });

  it("batida a Meta, troca para a Super meta e marca a Meta como batida", () => {
    render(<GoalTierCard title="Mês" progress={progressOf(1100)} />);

    expect(screen.getByRole("progressbar", { name: "Progresso da Super meta" })).toBeInTheDocument();
    expect(screen.getByText("Meta ✓")).toBeInTheDocument();
    expect(textOf(screen.getByRole("region", { name: "Mês" }))).toMatch(/Faltam R\$ 100,00 para a Super meta/);
  });

  it("depois da Meta black, o excedente aparece na própria Meta black", () => {
    render(<GoalTierCard title="Mês" progress={progressOf(1800)} />);

    expect(screen.getByRole("progressbar", { name: "Progresso da Meta black" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(textOf(screen.getByRole("region", { name: "Mês" }))).toMatch(/Meta black batida, com R\$ 300,00 além dela/);
  });
});
