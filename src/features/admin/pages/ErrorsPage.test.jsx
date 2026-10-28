import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithQuery } from "../../../test/renderWithQuery";
import ErrorsPage from "./ErrorsPage";

vi.mock("../components/ErrorLogWidget/ErrorLogWidget", () => ({
  default: () => <p>Widget logs de erro</p>,
}));
vi.mock("../components/TestReportWidget/TestReportWidget", () => ({
  default: () => <p>Widget logs de teste</p>,
}));

describe("ErrorsPage", () => {
  it("mostra o título e os widgets de logs de erro e de teste", () => {
    renderWithQuery(<ErrorsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Erros" })).toBeInTheDocument();
    expect(screen.getByText("Widget logs de erro")).toBeInTheDocument();
    expect(screen.getByText("Widget logs de teste")).toBeInTheDocument();
  });
});
