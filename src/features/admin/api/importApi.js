import api from "../../../shared/apiClient.js";
import { isMockEnabled } from "../../../shared/utils/isMockEnabled";

const CSV_HEADERS = { headers: { "Content-Type": "text/csv" } };

// CSV do Sheets vem em UTF-8; o do Excel em português costuma vir em Windows-1252.
// Lendo como UTF-8 um arquivo do Excel, "Renovação" e nomes com acento quebrariam
export const readCsvFile = async (file) => {
  const bytes = await file.arrayBuffer();

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
};

const assertMockDisabled = () => {
  if (isMockEnabled()) {
    throw new Error("A importação não funciona com os dados de demonstração");
  }
};

// Só lê o arquivo e devolve o resumo: nunca grava
export const previewImport = async (csvText) => {
  assertMockDisabled();

  const response = await api.post("/sales/import/preview", csvText, CSV_HEADERS);
  return response.data.data;
};

// Arquivo com erro volta 400 com o mesmo resumo da prévia: nada foi gravado
export const importSales = async (csvText) => {
  assertMockDisabled();

  try {
    const response = await api.post("/sales/import", csvText, CSV_HEADERS);
    return { imported: true, report: response.data.data };
  } catch (error) {
    const report = error.response?.data?.data;
    if (error.response?.status === 400 && report) {
      return { imported: false, report };
    }
    throw error;
  }
};
