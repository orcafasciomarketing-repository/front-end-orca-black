import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithQuery } from "../../../../test/renderWithQuery";
import { importSales, previewImport } from "../../api/importApi";
import ImportSalesWidget from "./ImportSalesWidget";

vi.mock("../../api/importApi", async (importOriginal) => ({
  ...(await importOriginal()),
  previewImport: vi.fn(),
  importSales: vi.fn(),
}));
vi.mock("../../../../shared/errorLogger", () => ({ reportError: vi.fn() }));

const buildReport = (overrides = {}) => ({
  current: { count: 2, total: 1500 },
  file: { count: 3, total: 4000, withVendor: 1, withoutVendor: 2 },
  errors: [],
  warnings: [],
  duplicates: [],
  ignored: [],
  ...overrides,
});

const CSV = "Setor,Valor da venda,Data da venda\nB2B,1000,27/11/2026";

const chooseFile = () => {
  const file = new File([CSV], "vendas.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("Arquivo CSV"), { target: { files: [file] } });
};

describe("ImportSalesWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tem a planilha modelo para baixar ao lado do botão de escolher o arquivo", () => {
    renderWithQuery(<ImportSalesWidget />);

    const link = screen.getByRole("link", { name: "Baixar planilha modelo" });
    expect(link).toHaveAttribute("href", "/modelo-importacao-vendas.csv");
    expect(link).toHaveAttribute("download", "modelo-importacao-vendas.csv");
  });

  it("ao escolher o arquivo mostra a prévia: o que existe hoje e o que o arquivo traz", async () => {
    previewImport.mockResolvedValue(buildReport());
    renderWithQuery(<ImportSalesWidget />);

    chooseFile();

    expect(await screen.findByText("3 vendas · R$ 4.000,00")).toBeInTheDocument();
    expect(screen.getByText("2 vendas · R$ 1.500,00")).toBeInTheDocument();
    expect(screen.getByText("1 com vendedor · 2 sem vendedor")).toBeInTheDocument();
    expect(previewImport).toHaveBeenCalledWith(CSV);
    expect(importSales).not.toHaveBeenCalled();
  });

  it("confirmar envia o mesmo arquivo e mostra o resultado", async () => {
    previewImport.mockResolvedValue(buildReport());
    importSales.mockResolvedValue({ imported: true, report: buildReport({ current: { count: 3, total: 4000 } }) });
    renderWithQuery(<ImportSalesWidget />);

    chooseFile();
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar importação" }));

    expect(await screen.findByText("Importação concluída: 3 vendas importadas")).toBeInTheDocument();
    expect(importSales).toHaveBeenCalledWith(CSV);
    expect(screen.queryByRole("button", { name: "Confirmar importação" })).not.toBeInTheDocument();
  });

  it("arquivo com erros → lista os erros por linha e não deixa confirmar", async () => {
    previewImport.mockResolvedValue(buildReport({ errors: [{ linha: 4, mensagem: "Data da venda inválida" }] }));
    renderWithQuery(<ImportSalesWidget />);

    chooseFile();

    const errors = await screen.findByRole("region", { name: "Erros (impedem a importação)" });
    expect(errors).toHaveTextContent("Linha 4: Data da venda inválida");
    expect(screen.getByRole("button", { name: "Confirmar importação" })).toBeDisabled();
  });

  it("avisos e duplicadas aparecem, mas não impedem confirmar", async () => {
    previewImport.mockResolvedValue(
      buildReport({
        warnings: [{ linha: 2, mensagem: 'Passagem não cadastrada (descartada): "Ana"' }],
        duplicates: [{ linha: 3, mensagem: "Parece já existir na planilha (Empresa X)" }],
      }),
    );
    renderWithQuery(<ImportSalesWidget />);

    chooseFile();

    expect(await screen.findByText(/Parece já existir na planilha/)).toBeInTheDocument();
    expect(screen.getByText(/Passagem não cadastrada/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar importação" })).toBeEnabled();
  });

  it("arquivo sem nenhuma venda → não deixa confirmar", async () => {
    previewImport.mockResolvedValue(buildReport({ file: { count: 0, total: 0, withVendor: 0, withoutVendor: 0 } }));
    renderWithQuery(<ImportSalesWidget />);

    chooseFile();

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirmar importação" })).toBeDisabled());
  });

  it("importação recusada pelo backend → avisa que nada foi importado", async () => {
    previewImport.mockResolvedValue(buildReport());
    importSales.mockResolvedValue({
      imported: false,
      report: buildReport({ errors: [{ linha: 2, mensagem: 'Vendedor "Fulano" não cadastrado' }] }),
    });
    renderWithQuery(<ImportSalesWidget />);

    chooseFile();
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar importação" }));

    expect(await screen.findByText("O arquivo tem erros, nada foi importado")).toBeInTheDocument();
    expect(screen.getByText(/Vendedor "Fulano" não cadastrado/)).toBeInTheDocument();
  });

  it("falha ao gerar a prévia → mostra a mensagem", async () => {
    previewImport.mockRejectedValue(new Error("Network Error"));
    renderWithQuery(<ImportSalesWidget />);

    chooseFile();

    expect(await screen.findByText("Não foi possível gerar a prévia: Network Error")).toBeInTheDocument();
  });
});
