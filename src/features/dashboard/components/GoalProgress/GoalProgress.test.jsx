import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import GoalProgress from "./GoalProgress";

describe("GoalProgress", () => {
  it("mostra o total e a meta em reais", () => {
    render(<GoalProgress total={1500299.2} goal={3999495.33} percent={37.51} />);

    expect(screen.getByText(/1\.500\.299,20/)).toBeInTheDocument();
    expect(screen.getByText(/3\.999\.495,33/)).toBeInTheDocument();
  });

  it("preenche a barra de acordo com o percent", () => {
    render(<GoalProgress total={100} goal={400} percent={25} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "25");
    expect(bar.firstChild).toHaveStyle({ width: "25%" });
  });

  it("limita a barra em 100% quando a meta é batida", () => {
    render(<GoalProgress total={600} goal={400} percent={150} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar.firstChild).toHaveStyle({ width: "100%" });
  });
});
