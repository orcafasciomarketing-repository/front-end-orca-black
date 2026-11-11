import { campaignKey, getSelectedCampaign } from "../../campaigns/utils/campaignSelection";
import { getAdminSales, getVendors } from "../api/slidesApi";

export const adminKeys = {
  sales: (vendorId, campaignId) => ["admin-sales", campaignKey(campaignId), vendorId || "all"],
  vendors: ["vendors"],
};

export const adminSalesQuery = (vendorId, campaignId = getSelectedCampaign()) => ({
  queryKey: adminKeys.sales(vendorId, campaignId),
  queryFn: () => getAdminSales(vendorId, campaignId),
});

export const vendorsQuery = {
  queryKey: adminKeys.vendors,
  queryFn: getVendors,
};
