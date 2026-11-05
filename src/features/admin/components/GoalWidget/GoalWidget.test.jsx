import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getGoal } from "../../api/slidesApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import GoalWidget from "./GoalWidget";

vi.mock("../../api/slidesApi", () => ({
  getGoal: vi.fn(),
}));

describe("GoalWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra o vendido, a meta, o percentual e quanto falta", async () => {
    getGoal.mockResolvedValue({ goal: 3000000, total: 212000, percent: 7.07 });

    renderWithQuery(<GoalWidget />);

    expect(await screen.findByText("7,07%")).toBeInTheDocument();
    expect(screen.getByText(/212\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/de R\$\s3\.000\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/Faltam R\$\s2\.788\.000,00/)).toBeInTheDocument();

    const bar = screen.getByRole("progressbar", { name: "Progresso da meta" });
    expect(bar).toHaveAttribute("aria-valuenow", "7.07");
    expect(bar.firstChild).toHaveStyle({ width: "7.07%" });
  });

  it("limita a barra em 100% e avisa quando a meta é batida", async () => {
    getGoal.mockResolvedValue({ goal: 400, total: 600, percent: 150 });

    renderWithQuery(<GoalWidget />);

    expect(await screen.findByText("Meta batida!")).toBeInTheDocument();
    expect(screen.getByText("150%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByRole("progressbar").firstChild).toHaveStyle({ width: "100%" });
  });
});
