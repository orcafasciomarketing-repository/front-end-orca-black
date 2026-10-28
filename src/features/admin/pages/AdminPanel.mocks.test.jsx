import { configure, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadFile } from "../utils/downloadFile";
import AdminPanel from "./AdminPanel";

configure({ asyncUtilTimeout: 4000 });

vi.mock("../utils/downloadFile", () => ({
  downloadFile: vi.fn(),
}));

const DEALS_BY_WEEK = {
  current: [
    "Construtora Horizonte",
    "Edifício Aurora",
    "Prefeitura de Campinas",
    "Secretaria de Obras SP",
    "Reforma Vila Nova",
    "Galpão Logístico Sul",
    "Condomínio Jardins",
  ],
  last: [
    "Governo do Estado MG",
    "Câmara Municipal BH",
    "Shopping Central",
    "Hospital Santa Clara",
    "Escola Nova Era",
    "Clínica Bem Viver",
  ],
  twoAgo: ["Prefeitura de Santos", "Residencial Primavera", "Loja Matriz Centro"],
  threeAgo: ["Hotel Beira Mar", "Indústria Metalúrgica"],
};

const ALL_DEALS = Object.values(DEALS_BY_WEEK).flat();

const WEEK_KEYS = {
  current: "2026-10-19",
  last: "2026-10-12",
  twoAgo: "2026-10-05",
  threeAgo: "2026-09-28",
};

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminPanel />
    </QueryClientProvider>,
  );

const sectionOf = (title) => screen.getByRole("heading", { name: title }).closest("section");
const salesWidget = () => sectionOf("Vendas cadastradas");
const weekSelect = () => screen.getByRole("combobox", { name: "Filtrar por semana" });
const vendorSelect = () => screen.getByRole("combobox", { name: "Filtrar por vendedor" });

const visibleDeals = () => ALL_DEALS.filter((deal) => within(salesWidget()).queryByText(deal));

const expectListToShow = async (deals) => {
  await waitFor(() => expect(visibleDeals().sort()).toEqual([...deals].sort()));
  expect(within(salesWidget()).getByText(String(deals.length))).toBeInTheDocument();
};

const ready = async () => {
  await screen.findByRole("heading", { name: "Vendas cadastradas" });
  await waitFor(() => expect(within(vendorSelect()).getAllByRole("option").length).toBeGreaterThan(1));
};

const exportReport = async () => {
  downloadFile.mockClear();
  fireEvent.click(screen.getByRole("button", { name: /Exportar/ }));
  await waitFor(() => expect(downloadFile).toHaveBeenCalled());

  const [csv, fileName] = downloadFile.mock.lastCall;
  const rows = csv.replace("\uFEFF", "").split("\r\n");

  return { csv, fileName, header: rows[0], rows: rows.slice(1) };
};

describe("Admin com os dados falsos (quarta, 21/10/2026)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_USE_MOCKS", "true");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("as opções de semana vão da atual até a semana do dia 1º de outubro", async () => {
    renderPanel();
    await ready();

    expect(within(weekSelect()).getAllByRole("option").map((option) => option.value)).toEqual([
      "",
      WEEK_KEYS.current,
      WEEK_KEYS.last,
      WEEK_KEYS.twoAgo,
      WEEK_KEYS.threeAgo,
    ]);
  });

  it("'Todas as semanas' mostra as 18 vendas, inclusive as canceladas, e o relatório traz as 18", async () => {
    renderPanel();
    await ready();

    await expectListToShow(ALL_DEALS);

    const { rows, fileName, header } = await exportReport();
    expect(header).toBe("Negociação;Status;Valor (R$);Tipo;Segmento;Vendedor;Passagem;Data da venda;ID na RD");
    expect(rows).toHaveLength(18);
    expect(fileName).toBe("vendas-todos-2026-10-21.csv");
  });

  it.each([
    ["semana atual", "current"],
    ["semana passada", "last"],
    ["duas semanas atrás", "twoAgo"],
    ["três semanas atrás", "threeAgo"],
  ])("%s: a lista e o relatório trazem só as vendas daquela semana", async (_, week) => {
    renderPanel();
    await ready();

    fireEvent.change(weekSelect(), { target: { value: WEEK_KEYS[week] } });
    await expectListToShow(DEALS_BY_WEEK[week]);

    const others = ALL_DEALS.filter((deal) => !DEALS_BY_WEEK[week].includes(deal));
    const { csv, rows, fileName } = await exportReport();

    expect(rows).toHaveLength(DEALS_BY_WEEK[week].length);
    DEALS_BY_WEEK[week].forEach((deal) => expect(csv).toContain(deal));
    others.forEach((deal) => expect(csv).not.toContain(deal));
    expect(fileName).toBe(`vendas-todos-semana-${WEEK_KEYS[week]}-2026-10-21.csv`);
  });

  it("os limites da semana batem: segunda 00:00 na atual, domingo 23:59 na passada", async () => {
    renderPanel();
    await ready();

    fireEvent.change(weekSelect(), { target: { value: WEEK_KEYS.current } });
    await expectListToShow(DEALS_BY_WEEK.current);
    expect(within(salesWidget()).getByText("Condomínio Jardins")).toBeInTheDocument();
    expect(within(salesWidget()).queryByText("Clínica Bem Viver")).not.toBeInTheDocument();

    fireEvent.change(weekSelect(), { target: { value: WEEK_KEYS.last } });
    await expectListToShow(DEALS_BY_WEEK.last);
    expect(within(salesWidget()).getByText("Clínica Bem Viver")).toBeInTheDocument();
  });

  it("semana passada + Gustavo: só as 2 vendas dele naquela semana", async () => {
    renderPanel();
    await ready();

    fireEvent.change(weekSelect(), { target: { value: WEEK_KEYS.last } });
    fireEvent.change(vendorSelect(), { target: { value: "vendor-gustavo" } });
    await expectListToShow(["Governo do Estado MG", "Câmara Municipal BH"]);

    const { rows, fileName } = await exportReport();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.includes("Gustavo Rocha"))).toBe(true);
    expect(fileName).toBe("vendas-gustavo-rocha-semana-2026-10-12-2026-10-21.csv");
  });

  it("Gustavo em todas as semanas: as 3 vendas dele (atual e passada)", async () => {
    renderPanel();
    await ready();

    fireEvent.change(vendorSelect(), { target: { value: "vendor-gustavo" } });
    await expectListToShow(["Prefeitura de Campinas", "Governo do Estado MG", "Câmara Municipal BH"]);
  });

  it("Karine na semana atual: lista vazia e relatório só com o cabeçalho", async () => {
    renderPanel();
    await ready();

    fireEvent.change(weekSelect(), { target: { value: WEEK_KEYS.current } });
    fireEvent.change(vendorSelect(), { target: { value: "vendor-karine" } });

    await waitFor(() => expect(within(salesWidget()).getByText("Nenhuma venda encontrada")).toBeInTheDocument());

    const { rows, header } = await exportReport();
    expect(header).toContain("Negociação");
    expect(rows).toHaveLength(0);
  });

  it("o relatório traduz status, tipo, segmento, valor, vendedor, passagem e data", async () => {
    renderPanel();
    await ready();

    fireEvent.change(weekSelect(), { target: { value: WEEK_KEYS.current } });
    await expectListToShow(DEALS_BY_WEEK.current);

    const { rows } = await exportReport();
    const row = (deal) => rows.find((line) => line.startsWith(deal)).split(";");

    expect(row("Construtora Horizonte")).toEqual([
      "Construtora Horizonte",
      "Ativa",
      "12000,00",
      "Vendas",
      "B2B",
      "Brenda Lima",
      "Izabel Ramos, Lucas Daniel",
      expect.stringMatching(/^\d{2}\/10\/2026,? \d{2}:\d{2}$/),
      "rd-deal-c1",
    ]);
    expect(row("Galpão Logístico Sul")[1]).toBe("Cancelada");
    expect(row("Secretaria de Obras SP").slice(3, 5)).toEqual(["Renovação", "B2G"]);
    expect(row("Edifício Aurora")[6]).toBe("");
  });

  it("os rankings do dashboard mostram a campanha toda", async () => {
    renderPanel();

    await waitFor(() => expect(within(sectionOf("Rank dos vendedores")).getByText("Gustavo Rocha")).toBeInTheDocument());
    expect(within(sectionOf("Rank dos vendedores")).getByText("Gustavo Rocha").closest("li")).toHaveTextContent("1º");

    await waitFor(() => expect(within(sectionOf("Rank das passagens")).getByText("Caio Martins")).toBeInTheDocument());
    expect(within(sectionOf("Rank das passagens")).getByText("Caio Martins").closest("li")).toHaveTextContent("1º");

    fireEvent.click(within(sectionOf("Rank dos vendedores")).getByRole("tab", { name: "Renovação" }));
    await waitFor(() => expect(within(sectionOf("Rank dos vendedores")).getByText("Karine Souza")).toBeInTheDocument());
  });
});
