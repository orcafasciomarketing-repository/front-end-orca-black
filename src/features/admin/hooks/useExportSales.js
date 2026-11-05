import { useMutation, useQueryClient } from "@tanstack/react-query";

import { reportError } from "../../../shared/errorLogger";
import { downloadFile } from "../utils/downloadFile";
import { buildExportFileName, salesToCsv } from "../utils/salesCsv";
import { filterSalesBySegment } from "../utils/segments";
import { filterSalesByPeriod } from "../utils/periods";
import { adminSalesQuery } from "./adminQueries";

export function useExportSales() {
  const queryClient = useQueryClient();

  const { mutate, isPending, isError } = useMutation({
    mutationFn: async ({ vendor, period, segment }) => {
      const { sales } = await queryClient.fetchQuery(adminSalesQuery(vendor?._id));
      const filteredSales = filterSalesBySegment(filterSalesByPeriod(sales, period), segment);

      downloadFile(
        salesToCsv(filteredSales),
        buildExportFileName({ vendor, period, segment }),
        "text/csv;charset=utf-8",
      );
    },
    onError: (error) => reportError(error, { location: "Admin › exportação de vendas" }),
  });

  return { exportSales: mutate, isExporting: isPending, exportFailed: isError };
}
