import { campaignParams } from "../../campaigns/utils/campaignSelection";
import { http } from "../../../shared/httpClient.js";

export const getFullScoreboard = async (campaign = "") => {
  const response = await http.get("/analytics/scoreboard", { params: { period: "all", ...campaignParams(campaign) } });
  return response.data.data;
};
