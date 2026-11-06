import { useCallback } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { filterSalesBySegment } from "../utils/segments";
import { buildVendorProfile } from "../utils/vendorProfile";
import { adminSalesQuery } from "./adminQueries";

export function useVendorProfile(vendorId, segment = "") {
  const selectProfile = useCallback(
    ({ sales }) => buildVendorProfile(filterSalesBySegment(sales, segment), vendorId),
    [vendorId, segment],
  );

  const { data } = useSuspenseQuery({ ...adminSalesQuery(""), select: selectProfile });

  return { profile: data };
}
