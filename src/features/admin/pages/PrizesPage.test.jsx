import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "../../auth/context/AuthContext";
import { createPrizeWithdrawal, deletePrizeWithdrawal, getPrizes, getPrizeWithdrawals } from "../api/prizesApi";
import PrizesPage from "./PrizesPage";

vi.mock("../api/prizesApi", async (importOriginal) => ({
  ...(await importOriginal()),
  getPrizes: vi.fn(),
  getPrizeWithdrawals: vi.fn(),
  createPrizeWithdrawal: vi.fn(),
  deletePrizeWithdrawal: vi.fn(),
}));
vi.mock("../utils/downloadFile", () => ({ downloadFile: vi.fn() }));
vi.mock("../../../shared/errorLogger", () => ({ reportError: vi.fn() }));

const person = (overrides) => ({
  personId: "p1",
  kind: "vendor",
  name: "Ana Lima",
  job: "B2B Venda",
  imageUrl: "",
  teamId: "t1",
  accumulated: 15,
  currentWeek: 3,
  earned: 1,
  withdrawn: 0,
  balance: 1,
  debtPoints: 0,
  nextPrizeAt: 20,
  pointsToNext: 5,
  ...overrides,
});

const PRIZES = {
  segment: null,
  step: 10,
  today: "2026-11-09",
  currentWeek: { start: "2026-11-09", end: "2026-11-15" },
  teams: [
    { teamId: "t1", teamName: "Wizards" },
    { teamId: "t2", teamName: "Orçawinx" },
  ],
  people: [
    person(),
    // Venda cancelada depois da retirada: devendo 3 pontos
    person({ personId: "p2", name: "Bruno Dias", teamId: "t2", accumulated: 7, earned: 0, withdrawn: 1, balance: -1, debtPoints: 3, nextPrizeAt: 20, pointsToNext: 13 }),
    person({ personId: "s1", kind: "sdr", name: "Caio CS", job: "CS", teamId: "t2", accumulated: 4, earned: 0, balance: 0, pointsToNext: 6 }),
  ],
};

const WITHDRAWALS = [
  { _id: "w1", personId: "p2", kind: "vendor", name: "Bruno Dias", job: "B2B Venda", quantity: 1, prize: "Caneca", withdrawnAt: "2026-11-02", createdBy: "master@teste.com" },
];

const renderAs = (role) =>
  render(
    <AuthContext value={{ state: { user: { _id: "1", email: "x@teste.com", role }, token: "t" } }}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <PrizesPage />
      </QueryClientProvider>
    </AuthContext>,
  );

const rowOf = (name) => screen.getByRole("rowheader", { name: new RegExp(name) }).closest("tr");
const balanceOf = (name) => screen.getByLabelText(`Saldo de ${name}`).textContent;

describe("PrizesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPrizes.mockResolvedValue(PRIZES);
    getPrizeWithdrawals.mockResolvedValue(WITHDRAWALS);
    createPrizeWithdrawal.mockResolvedValue({ _id: "w2" });
    deletePrizeWithdrawal.mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("admin vê o saldo de todos, quem está devendo e o histórico, sem registrar nem excluir", async () => {
    renderAs("admin");

    await screen.findByRole("region", { name: "Saldo de prêmios" });
    expect(balanceOf("Ana Lima")).toBe("1 prêmio");
    expect(balanceOf("Bruno Dias")).toBe("Devendo 3 pontos");
    expect(balanceOf("Caio CS")).toBe("0 prêmios");
    expect(within(rowOf("Ana Lima")).getByText("Faltam 5 pontos")).toBeInTheDocument();
    expect(screen.getByLabelText("Prêmios para retirar")).toHaveTextContent("1 prêmio para retirar");

    const history = await screen.findByRole("list", { name: "Histórico de retiradas" });
    expect(history).toHaveTextContent("Bruno Dias retirou 1 prêmio: Caneca");

    expect(screen.queryByRole("button", { name: "Registrar retirada" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Excluir retirada/ })).not.toBeInTheDocument();
    expect(getPrizes).toHaveBeenCalledWith("");
  });

  it("filtros: só quem tem prêmio para retirar e só pessoas de passagem", async () => {
    renderAs("admin");
    await screen.findByRole("region", { name: "Saldo de prêmios" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Só quem tem prêmio para retirar" }));
    expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["Ana LimaB2B Venda"]);

    fireEvent.click(screen.getByRole("checkbox", { name: "Só quem tem prêmio para retirar" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Tipo" }), { target: { value: "sdr" } });
    expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["Caio CSCS"]);
  });

  it("master registra uma retirada dentro do saldo, com a segunda da semana como dia", async () => {
    const confirm = vi.spyOn(window, "confirm");
    renderAs("master");
    await screen.findByRole("region", { name: "Saldo de prêmios" });

    fireEvent.click(within(rowOf("Ana Lima")).getByRole("button", { name: "Registrar retirada" }));
    const form = screen.getByRole("form", { name: "Registrar retirada de Ana Lima" });
    expect(within(form).getByLabelText("Dia da retirada")).toHaveValue("2026-11-09");

    fireEvent.change(within(form).getByLabelText("Prêmio"), { target: { value: " Fone JBL " } });
    fireEvent.click(within(form).getByRole("button", { name: "Registrar" }));

    await waitFor(() =>
      expect(createPrizeWithdrawal).toHaveBeenCalledWith({
        personId: "p1",
        kind: "vendor",
        quantity: 1,
        prize: "Fone JBL",
        withdrawnAt: "2026-11-09",
      }),
    );
    expect(confirm).not.toHaveBeenCalled();
    expect(await screen.findByText("Retirada registrada")).toBeInTheDocument();
  });

  it("sem prêmio informado não envia", async () => {
    renderAs("master");
    await screen.findByRole("region", { name: "Saldo de prêmios" });

    fireEvent.click(within(rowOf("Ana Lima")).getByRole("button", { name: "Registrar retirada" }));
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    expect(screen.getByText("Informe qual prêmio")).toBeInTheDocument();
    expect(createPrizeWithdrawal).not.toHaveBeenCalled();
  });

  it("acima do saldo avisa, pede confirmação e só registra se confirmar", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderAs("master");
    await screen.findByRole("region", { name: "Saldo de prêmios" });

    fireEvent.click(within(rowOf("Ana Lima")).getByRole("button", { name: "Registrar retirada" }));
    const form = screen.getByRole("form", { name: "Registrar retirada de Ana Lima" });
    fireEvent.change(within(form).getByLabelText("Quantidade"), { target: { value: "2" } });
    fireEvent.change(within(form).getByLabelText("Prêmio"), { target: { value: "Caneca" } });

    expect(within(form).getByRole("status")).toHaveTextContent("Ana Lima ficaria devendo 5 pontos");

    fireEvent.click(within(form).getByRole("button", { name: "Registrar" }));
    expect(confirm).toHaveBeenCalledWith(
      "Ana Lima tem saldo de 1 prêmio. Registrar 2 prêmios deixa o saldo em -1 (devendo 5 pontos). Registrar mesmo assim?",
    );
    expect(createPrizeWithdrawal).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(within(form).getByRole("button", { name: "Registrar" }));
    await waitFor(() =>
      expect(createPrizeWithdrawal).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 2, prize: "Caneca", confirmOverBalance: true }),
      ),
    );
  });

  it("mostra a mensagem do backend quando a retirada é recusada", async () => {
    createPrizeWithdrawal.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 409"), {
        response: { status: 409, data: { error: "Ana Lima tem saldo de 0 prêmios. Confirme para registrar mesmo assim" } },
      }),
    );
    renderAs("master");
    await screen.findByRole("region", { name: "Saldo de prêmios" });

    fireEvent.click(within(rowOf("Ana Lima")).getByRole("button", { name: "Registrar retirada" }));
    fireEvent.change(screen.getByLabelText("Prêmio"), { target: { value: "Caneca" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    expect(
      await screen.findByText("Não foi possível registrar: Ana Lima tem saldo de 0 prêmios. Confirme para registrar mesmo assim"),
    ).toBeInTheDocument();
  });

  it("master exclui uma retirada errada depois de confirmar", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderAs("master");

    fireEvent.click(await screen.findByRole("button", { name: "Excluir retirada de Bruno Dias (Caneca)" }));

    await waitFor(() => expect(deletePrizeWithdrawal).toHaveBeenCalledWith("w1"));
  });

  it("b2b abre no B2B, sem poder trocar o setor nem registrar", async () => {
    renderAs("b2b");
    await screen.findByRole("region", { name: "Saldo de prêmios" });

    const select = screen.getByRole("combobox", { name: "Filtrar prêmios por setor" });
    expect(select).toBeDisabled();
    expect(getPrizes).toHaveBeenCalledWith("B2B");
    expect(getPrizeWithdrawals).toHaveBeenCalledWith("B2B");
    expect(screen.queryByRole("button", { name: "Registrar retirada" })).not.toBeInTheDocument();
  });
});
