import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import GoalBreakdown from "./GoalBreakdown";

const textOf = (element) => element.textContent.replace(/\u00a0/g, " ");

const person = (overrides = {}) => ({
  ticket: 2000,
  month: { current: "goal", remaining: 5000, salesNeeded: 3 },
  ...overrides,
});

describe("GoalBreakdown", () => {
  it("mostra as vendas que faltam no mês e na semana, pelo ticket médio", () => {
    render(<GoalBreakdown person={person()} week={{ current: "super", remaining: 1500, salesNeeded: 1 }} />);

    const card = screen.getByRole("region", { name: "Como chegar na meta" });
    expect(textOf(card)).toContain("Pelo ticket médio de R$ 2.000,00");
    expect(textOf(screen.getByLabelText("Vendas que faltam"))).toBe(
      "Vendas que faltam no mês3 vendasPara a Meta (R$ 5.000,00)Vendas que faltam na semana1 vendaPara a Super meta da semana (R$ 1.500,00)",
    );
  });

  it("com a conversão, mostra também os leads que faltam no mês e na semana", () => {
    render(
      <GoalBreakdown
        person={person({ conversion: 30, month: { current: "goal", remaining: 5000, salesNeeded: 3, leadsNeeded: 9 } })}
        week={{ current: "goal", remaining: 1500, salesNeeded: 1, leadsNeeded: 3 }}
      />,
    );

    expect(textOf(screen.getByRole("region", { name: "Como chegar na meta" }))).toContain(
      "Pelo ticket médio de R$ 2.000,00 e conversão de 30% dos leads",
    );
    expect(textOf(screen.getByLabelText("Vendas que faltam"))).toContain("Leads que faltam no mês9 leads");
    expect(textOf(screen.getByLabelText("Vendas que faltam"))).toContain("Leads que faltam na semana3 leads");
  });

  it("sem ticket (como no B2G), não aparece", () => {
    const { container } = render(
      <GoalBreakdown person={person({ ticket: null, month: { current: "goal", remaining: 10 } })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
