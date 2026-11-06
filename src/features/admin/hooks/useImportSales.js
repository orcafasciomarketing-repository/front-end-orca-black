import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reportError } from "../../../shared/errorLogger";
import { importSales, previewImport } from "../api/importApi";

const SALES_QUERY_KEYS = [["admin-sales"], ["admin-goal"], ["admin-rank"], ["admin-rank-sdr"]];

export function useImportSales() {
  const queryClient = useQueryClient();

  const preview = useMutation({
    mutationFn: (csvText) => previewImport(csvText),
    onError: (error) => reportError(error, { location: "Admin › prévia da importação" }),
  });

  const confirm = useMutation({
    mutationFn: (csvText) => importSales(csvText),
    // Vendas, meta e rankings do admin mudaram: busca de novo (as TVs recebem o aviso pelo SSE)
    onSuccess: ({ imported }) => {
      if (!imported) return;
      SALES_QUERY_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
    },
    onError: (error) => reportError(error, { location: "Admin › importação de vendas" }),
  });

  return { preview, confirm };
}
