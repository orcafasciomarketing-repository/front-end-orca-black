import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCampaign, deleteCampaign, getCampaigns, updateCampaign } from "../api/campaignsApi";
import { getSelectedCampaign, setSelectedCampaign } from "../utils/campaignSelection";
import CampaignsPage from "./CampaignsPage";

vi.mock("../api/campaignsApi", async (importOriginal) => ({
  ...(await importOriginal()),
  getCampaigns: vi.fn(),
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
}));
vi.mock("../../../shared/errorLogger", () => ({ reportError: vi.fn() }));

const campaign = (overrides) => ({
  id: "c1",
  name: "Campanha Black",
  start: "2026-11-03",
  end: "2026-12-01",
  goals: { b2b: 2000000, b2g: 1000000 },
  goal: 3000000,
  active: true,
  hasBlackTier: true,
  sales: { count: 12, total: 45000 },
  ...overrides,
});

const CAMPAIGNS = [
  campaign({
    id: "c2",
    name: "Março",
    start: "2027-03-01",
    end: "2027-03-31",
    goals: { b2b: 5000, b2g: 2000 },
    goal: 7000,
    active: false,
    hasBlackTier: false,
    sales: { count: 1, total: 400 },
  }),
  campaign(),
];

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CampaignsPage />
    </QueryClientProvider>,
  );

const rowOf = (name) => screen.getByRole("rowheader", { name: new RegExp(name) }).closest("tr");
const textOf = (element) => element.textContent.replace(/\u00a0/g, " ");

describe("CampaignsPage", () => {
  beforeEach(() => {
    getCampaigns.mockResolvedValue(CAMPAIGNS);
    createCampaign.mockResolvedValue(campaign({ id: "c3" }));
    updateCampaign.mockResolvedValue(campaign());
    deleteCampaign.mockResolvedValue();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setSelectedCampaign("");
  });

  it("lista as campanhas com período, metas, vendas e quem é a ativa e a da Meta black", async () => {
    renderPage();

    const black = within(await screen.findByRole("table", { name: "Campanhas" })) && rowOf("Campanha Black");
    expect(textOf(black)).toContain("Ativa");
    expect(textOf(black)).toContain("Meta black");
    expect(textOf(black)).toContain("03/11/2026 a 01/12/2026");
    expect(textOf(black)).toContain("R$ 3.000.000,00");
    expect(textOf(black)).toContain("12 vendas · R$ 45.000,00");
    expect(within(black).queryByRole("button", { name: /Excluir/ })).not.toBeInTheDocument();
    expect(within(black).queryByRole("button", { name: /Tornar/ })).not.toBeInTheDocument();

    const march = rowOf("Março");
    expect(textOf(march)).toContain("1 venda · R$ 400,00");
    expect(textOf(march)).not.toContain("Ativa");
  });

  it("cadastra uma campanha nova com as metas em R$ e a meta total somada", async () => {
    renderPage();
    const form = await screen.findByRole("form", { name: "Cadastrar campanha" });

    fireEvent.click(within(form).getByRole("button", { name: "Cadastrar campanha" }));
    expect(within(form).getByText("Informe o nome da campanha")).toBeInTheDocument();
    expect(createCampaign).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByLabelText("Nome"), { target: { value: "Maio" } });
    fireEvent.change(within(form).getByLabelText("Início"), { target: { value: "2027-05-10" } });
    fireEvent.change(within(form).getByLabelText("Fim"), { target: { value: "2027-05-01" } });
    fireEvent.change(within(form).getByLabelText("Meta B2B"), { target: { value: "1500,50" } });
    fireEvent.change(within(form).getByLabelText("Meta B2G"), { target: { value: "500" } });
    fireEvent.click(within(form).getByRole("button", { name: "Cadastrar campanha" }));
    expect(within(form).getByText("A data de fim precisa ser igual ou depois do início")).toBeInTheDocument();

    fireEvent.change(within(form).getByLabelText("Fim"), { target: { value: "2027-05-31" } });
    fireEvent.click(within(form).getByLabelText(/Criar a Meta black/));
    expect(textOf(within(form).getByLabelText("Meta total"))).toBe("R$ 2.000,50");
    fireEvent.click(within(form).getByRole("button", { name: "Cadastrar campanha" }));

    await waitFor(() =>
      expect(createCampaign).toHaveBeenCalledWith({
        name: "Maio",
        start: "2027-05-10",
        end: "2027-05-31",
        goals: { b2b: 1500.5, b2g: 500 },
        hasBlackTier: true,
        active: false,
      }),
    );
    expect(await within(form).findByText("Campanha cadastrada")).toBeInTheDocument();
  });

  it("edita uma campanha com os dados dela já preenchidos", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Editar Março" }));
    const form = screen.getByRole("form", { name: "Editar campanha Março" });
    expect(within(form).getByLabelText("Nome")).toHaveValue("Março");
    expect(within(form).getByLabelText("Início")).toHaveValue("2027-03-01");

    fireEvent.change(within(form).getByLabelText("Nome"), { target: { value: "Março forte" } });
    fireEvent.click(within(form).getByRole("button", { name: "Salvar campanha" }));

    await waitFor(() =>
      expect(updateCampaign).toHaveBeenCalledWith("c2", {
        name: "Março forte",
        start: "2027-03-01",
        end: "2027-03-31",
        goals: { b2b: 5000, b2g: 2000 },
        hasBlackTier: false,
      }),
    );
  });

  it("a ativa não pode ser desmarcada na edição", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Editar Campanha Black" }));
    const form = screen.getByRole("form", { name: "Editar campanha Campanha Black" });
    expect(within(form).getByRole("checkbox", { name: /Campanha ativa/ })).toBeChecked();
    expect(within(form).getByRole("checkbox", { name: /Campanha ativa/ })).toBeDisabled();
  });

  it("tornar ativa pede confirmação e manda active: true", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Tornar Março a campanha ativa" }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() =>
      expect(updateCampaign).toHaveBeenCalledWith("c2", expect.objectContaining({ name: "Março", active: true })),
    );
  });

  it("excluir pede confirmação; se a excluída estava escolhida no menu, volta para a ativa", async () => {
    setSelectedCampaign("c2");
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Excluir Março" }));

    await waitFor(() => expect(deleteCampaign).toHaveBeenCalledWith("c2"));
    await waitFor(() => expect(getSelectedCampaign()).toBe(""));
  });

  it("mostra a mensagem do backend quando não dá para excluir", async () => {
    deleteCampaign.mockRejectedValue({
      response: { status: 409, data: { error: "A campanha tem retiradas de prêmio" } },
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Excluir Março" }));

    expect(await screen.findByText("Não foi possível excluir: A campanha tem retiradas de prêmio")).toBeInTheDocument();
  });
});
