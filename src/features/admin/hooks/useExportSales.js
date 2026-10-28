import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reportError } from "../../../shared/errorLogger";
import { downloadFile } from "../utils/downloadFile";
import { buildExportFileName, salesToCsv } from "../utils/salesCsv";
import { filterSalesByWeek } from "../utils/weeks";
import { adminSalesQuery } from "./adminQueries";

export function useExportSales() {
  const queryClient = useQueryClient();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: async ({ vendor, weekKey }) => {
      const { sales } = await queryClient.fetchQuery(adminSalesQuery(vendor?._id));
      const filteredSales = filterSalesByWeek(sales, weekKey);

      downloadFile(salesToCsv(filteredSales), buildExportFileName({ vendor, weekKey }), "text/csv;charset=utf-8");
    },
    onError: (error) => reportError(error, { location: "Admin › exportação de vendas" }),
  });

  return { exportSales: mutate, isExporting: isPending, exportFailed: isError };
}
