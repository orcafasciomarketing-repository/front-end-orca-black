import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import GoalBreakdown from "./GoalBreakdown";

const textOf = (element) => element.textContent.replace(/ /g, " ");

const person = (overrides = {}) => ({
  ticket: 2000,
  month: { current: "goal", remaining: 5000, salesNeeded: 3 },
  origins: {
    anticipation: { percent: 60, value: 6000 },
    upsell: { percent: 10, value: 1000 },
    churn: { percent: 20, value: 2000 },
  },
  ...overrides,
});

describe("GoalBreakdown", () => {
  it("mostra as vendas que faltam no mês e na semana, pelo ticket médio, e a meta por origem", () => {
    render(<GoalBreakdown person={person()} week={{ current: "super", remaining: 1500, salesNeeded: 1 }} />);

    const card = screen.getByRole("region", { name: "Como chegar na meta" });
    expect(textOf(card)).toContain("Pelo ticket médio de R$ 2.000,00");
    expect(textOf(screen.getByLabelText("Vendas que faltam"))).toBe(
      "Vendas que faltam no mês3 vendasPara a Meta (R$ 5.000,00)Vendas que faltam na semana1 vendaPara a Super meta da semana (R$ 1.500,00)",
    );
    expect(textOf(screen.getByLabelText("Divisão da meta por origem"))).toBe(
      "AntecipaçãoR$ 6.000,0060% da MetaUp-sellR$ 1.000,0010% da MetaChurnR$ 2.000,0020% da Meta",
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

  it("sem ticket, só a origem; sem origem (todas em 0), só as vendas; sem nada, não aparece", () => {
    const { rerender, container } = render(
      <GoalBreakdown person={person({ ticket: null, month: { current: "goal", remaining: 10 } })} />,
    );
    expect(screen.queryByLabelText("Vendas que faltam")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Divisão da meta por origem")).toBeInTheDocument();

    const zero = { percent: 0, value: 0 };
    rerender(<GoalBreakdown person={person({ origins: { anticipation: zero, upsell: zero, churn: zero } })} />);
    expect(screen.queryByLabelText("Divisão da meta por origem")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Vendas que faltam")).toBeInTheDocument();

    rerender(
      <GoalBreakdown person={person({ ticket: null, month: { current: "goal", remaining: 10 }, origins: null })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
