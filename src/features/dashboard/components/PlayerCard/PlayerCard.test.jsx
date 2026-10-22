import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PlayerCard from "./PlayerCard";

describe("PlayerCard", () => {
  it("mostra a posição, o nome e os pontos", () => {
    render(<PlayerCard player={{ id: "v1", name: "Bruno", points: 17 }} position={1} />);

    expect(screen.getByText("1º")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bruno" })).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("Pontos")).toBeInTheDocument();
  });

  it("usa o singular com 1 ponto", () => {
    render(<PlayerCard player={{ id: "v1", name: "Bruno", points: 1 }} position={3} />);

    expect(screen.getByText("Ponto")).toBeInTheDocument();
  });
});
