import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getErrorLogs } from "../../api/logsApi";
import { renderWithQuery } from "../../../../test/renderWithQuery";
import ErrorLogWidget from "./ErrorLogWidget";

vi.mock("../../api/logsApi", () => ({
  getErrorLogs: vi.fn(),
}));

const log = {
  _id: "1",
  message: "Falha ao buscar a meta",
  location: 'Dashboard › tela "goal"',
  url: "http://localhost:5173/",
  stack: "Error: Falha ao buscar a meta\n    at getGoal",
  componentStack: "at GoalBoard",
  occurredAt: "2026-10-22T15:00:00.000Z",
};

describe("ErrorLogWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista os erros com local, mensagem, página e stack", async () => {
    getErrorLogs.mockResolvedValue([log]);

    renderWithQuery(<ErrorLogWidget />);

    expect(await screen.findByText('Dashboard › tela "goal"')).toBeInTheDocument();
    expect(screen.getByText("Falha ao buscar a meta")).toBeInTheDocument();
    expect(screen.getByText("http://localhost:5173/")).toBeInTheDocument();
    expect(screen.getByText(/at getGoal/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("avisa quando não há erro", async () => {
    getErrorLogs.mockResolvedValue([]);

    renderWithQuery(<ErrorLogWidget />);

    expect(await screen.findByText("Nenhum erro registrado")).toBeInTheDocument();
  });
});
