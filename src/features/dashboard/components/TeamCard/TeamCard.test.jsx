import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TeamCard from "./TeamCard";

const team = {
  teamId: "1",
  teamName: "Sem freio",
  teamShirt: "http://localhost/camiseta_azul.png",
  sales: 110,
  farm: 1,
  passage: 0,
  total: 111,
};

const valueOf = (label) => screen.getByText(label).nextSibling;

describe("TeamCard", () => {
  it("mostra o total de pontos", () => {
    render(<TeamCard team={team} />);

    expect(screen.getByText("111")).toBeInTheDocument();
  });

  it("mostra os pontos de vendas, farmer e passagens, no singular e no plural", () => {
    render(<TeamCard team={team} />);

    expect(valueOf("Vendas")).toHaveTextContent("110 pontos");
    expect(valueOf("Farmer")).toHaveTextContent("1 ponto");
    expect(valueOf("Passagens")).toHaveTextContent("0 pontos");
  });

  it("trata campo ausente como zero", () => {
    render(<TeamCard team={{ ...team, farm: undefined }} />);

    expect(valueOf("Farmer")).toHaveTextContent("0 pontos");
  });

  it("mostra a camiseta do time com o nome no alt", () => {
    render(<TeamCard team={team} />);

    expect(screen.getByAltText("Sem freio")).toHaveAttribute("src", team.teamShirt);
  });

  it("não quebra quando o time não tem camiseta", () => {
    render(<TeamCard team={{ ...team, teamShirt: null }} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
