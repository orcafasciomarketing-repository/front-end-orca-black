import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { reportError } from "../../../shared/errorLogger";
import { vendorsQuery } from "./adminQueries";

export const getVendorLabel = (vendor) => vendor.vendorName || "Vendedor sem nome";

const byName = (vendors) =>
  [...vendors].sort((a, b) => getVendorLabel(a).localeCompare(getVendorLabel(b), "pt-BR"));

export function useVendors() {
  const { data, error } = useQuery({ ...vendorsQuery, select: byName });

  useEffect(() => {
    if (error) {
      reportError(error, { location: "Admin › lista de vendedores" });
    }
  }, [error]);

  return { vendors: data ?? [], vendorsFailed: Boolean(error) };
}
