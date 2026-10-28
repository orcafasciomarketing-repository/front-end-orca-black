import { getAdminSales, getVendors } from "../api/slidesApi";

export const adminKeys = {
  sales: (vendorId) => ["admin-sales", vendorId || "all"],
  vendors: ["vendors"],
};

export const adminSalesQuery = (vendorId) => ({
  queryKey: adminKeys.sales(vendorId),
  queryFn: () => getAdminSales(vendorId),
});

export const vendorsQuery = {
  queryKey: adminKeys.vendors,
  queryFn: getVendors,
};
