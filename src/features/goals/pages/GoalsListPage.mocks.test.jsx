import {
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "../../auth/context/AuthContext";
import { deleteGoalMonth, saveGoalVisibility } from "../api/goalsApi";
import GoalsListPage from "./GoalsListPage";

vi.mock("../api/goalsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  saveGoalVisibility: vi.fn(async (month, segment, visibility) => visibility),
  deleteGoalMonth: vi.fn(async () => undefined),
}));

configure({ asyncUtilTimeout: 10000 });
vi.setConfig({ testTimeout: 20000 });

function SetupLocation() {
  const location = useLocation();
  return <p>Cadastro em {`${location.pathname}${location.search}`}</p>;
}

const renderPage = (user) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AuthContext value={{ state: { user, token: "t" } }}>
        <MemoryRouter initialEntries={["/admin/metas/cadastradas"]}>
          <Routes>
            <Route
              path="/admin/metas/cadastradas"
              element={<GoalsListPage />}
            />
            <Route path="/admin/metas" element={<SetupLocation />} />
          </Routes>
        </MemoryRouter>
      </AuthContext>
    </QueryClientProvider>,
  );

const TONY = {
  _id: "u-tony",
  email: "tony@empresa.com",
  role: "admin",
  manageSegment: "b2b",
};
const MASTER = { _id: "u-master", email: "master@empresa.com", role: "master" };

const rowOf = (segment) =>
  screen
    .getAllByRole("row")
    .find(
      (row) =>
        within(row).queryByRole("rowheader") &&
        within(row).queryByText(segment, { exact: true }),
    );

describe("Metas cadastradas com os dados falsos (quarta 21/10/2026)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_USE_MOCKS", "true");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T15:00:00.000Z"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("lista os meses de cada setor com as faixas, o que os vendedores veem e o mês atual marcado", async () => {
    renderPage(MASTER);

    const table = await screen.findByRole("table", {
      name: "Lista de metas cadastradas",
    });
    const rows = within(table).getAllByRole("rowheader");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("outubro de 2026Atual");
    expect(rowOf("B2B")).toHaveTextContent("Tudo liberado");
    expect(rowOf("B2B")).toHaveTextContent("master@demo.com");

    fireEvent.change(screen.getByLabelText("Setor das metas cadastradas"), {
      target: { value: "b2g" },
    });
    expect(within(table).getAllByRole("rowheader")).toHaveLength(1);
    expect(rowOf("B2G")).toBeTruthy();
  });

  it("admin do B2B: edita, exclui e libera só o B2B; o B2G fica só para ver", async () => {
    renderPage(TONY);
    await screen.findByRole("table", { name: "Lista de metas cadastradas" });

    const b2g = within(rowOf("B2G"));
    expect(b2g.getByText("Só visualização")).toBeInTheDocument();
    expect(
      b2g.getByRole("button", { name: "Excluir B2G de outubro de 2026" }),
    ).toBeDisabled();
    expect(
      b2g.getByRole("button", {
        name: "O que os vendedores veem: B2G de outubro de 2026",
      }),
    ).toBeDisabled();

    const b2b = within(rowOf("B2B"));
    expect(
      b2b.getByRole("link", { name: "Editar B2B de outubro de 2026" }),
    ).toHaveAttribute("href", "/admin/metas?mes=2026-10&setor=b2b");
    fireEvent.click(
      b2b.getByRole("button", { name: "Excluir B2B de outubro de 2026" }),
    );
    await waitFor(() =>
      expect(deleteGoalMonth).toHaveBeenCalledWith("2026-10", "b2b"),
    );
  });

  it("escolher o que os vendedores veem: esconder a Meta black e a previsão, ou fechar o mês", async () => {
    renderPage(TONY);
    await screen.findByRole("table", { name: "Lista de metas cadastradas" });

    fireEvent.click(
      screen.getByRole("button", {
        name: "O que os vendedores veem: B2B de outubro de 2026",
      }),
    );
    const editor = within(
      screen.getByRole("form", {
        name: "O que os vendedores veem: B2B de outubro de 2026",
      }),
    );
    fireEvent.click(editor.getByRole("checkbox", { name: /Meta black/ }));
    fireEvent.click(editor.getByRole("checkbox", { name: /Previsão do mês/ }));
    fireEvent.click(editor.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(saveGoalVisibility).toHaveBeenCalledWith("2026-10", "b2b", {
        open: true,
        hidden: ["black", "forecast"],
      }),
    );
    expect(await editor.findByText("Salvo")).toBeInTheDocument();

    fireEvent.click(
      editor.getByRole("checkbox", { name: /Mês liberado para os vendedores/ }),
    );
    expect(editor.getByRole("checkbox", { name: /Resumo/ })).toBeDisabled();
    fireEvent.click(editor.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(saveGoalVisibility).toHaveBeenLastCalledWith("2026-10", "b2b", {
        open: false,
        hidden: ["black", "forecast"],
      }),
    );
  });

  it("cadastrar meta de um mês futuro abre o cadastro com o mês e o setor; admin do B2B só escolhe o B2B", async () => {
    renderPage(TONY);
    const form = within(
      await screen.findByRole("form", { name: "Cadastrar meta" }),
    );

    expect(form.getByLabelText("Mês da nova meta")).toHaveValue("2026-11");
    expect(
      within(form.getByLabelText("Setor da nova meta"))
        .getAllByRole("option")
        .map((item) => item.value),
    ).toEqual(["b2b"]);
    fireEvent.change(form.getByLabelText("Mês da nova meta"), {
      target: { value: "2027-01" },
    });
    fireEvent.click(form.getByRole("button", { name: "Abrir cadastro" }));

    expect(
      await screen.findByText("Cadastro em /admin/metas?mes=2027-01&setor=b2b"),
    ).toBeInTheDocument();
  });

  it("master escolhe B2B ou B2G na meta nova", async () => {
    renderPage(MASTER);
    const form = within(
      await screen.findByRole("form", { name: "Cadastrar meta" }),
    );
    expect(
      within(form.getByLabelText("Setor da nova meta"))
        .getAllByRole("option")
        .map((item) => item.value),
    ).toEqual(["b2b", "b2g"]);
  });
});
