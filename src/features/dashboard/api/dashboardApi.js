import { http } from "../../../shared/httpClient.js";
import { subscribeToMockSalesEvents } from "../../../shared/mocks/mockApi";
import { getApiUrl } from "../../../shared/utils/apiUrl";
import { isMockEnabled } from "../../../shared/utils/isMockEnabled";

export const SALE_VIDEO_URL = "/sale-video.mp4";

export const getGoal = async () => {
  const response = await http.get("/analytics/goal");
  return response.data.data;
};

export const getScoreboard = async (period) => {
  const response = await http.get("/analytics/scoreboard", { params: { period } });
  return response.data.data.map((team) => ({ ...team, id: team.teamId }));
};

export const getVendorRanking = async (period, department) => {
  const response = await http.get("/analytics/ranking", { params: { period, vendorDepartment: department } });
  return response.data.data.vendor.map((vendor) => ({ ...vendor, id: vendor.vendorId }));
};

export const getSdrRanking = async (period) => {
  const response = await http.get("/analytics/sdr-ranking", { params: { period } });
  return response.data.data.map((sdr) => ({ ...sdr, id: sdr.sdrId }));
};

const toPerson = (person) => ({
  name: person.name,
  job: person.job,
  imageUrl: person.imageUrl,
});

const getEventAssists = (event) => {
  if (Array.isArray(event.sdrs)) {
    return event.sdrs;
  }

  return event.sdr ? [event.sdr] : [];
};

export const toNewSale = (event) => {
  if (!event?.sale || !event?.vendor) {
    return null;
  }

  return {
    id: event.sale._id,
    type: event.sale.funnelType === "farm" ? "farm" : "sales",
    seller: {
      name: event.vendor.vendorName,
      job: event.vendor.job,
      imageUrl: event.vendor.imageUrl,
    },
    assists: getEventAssists(event).map(toPerson),
  };
};

export const checkSaleVideo = async () => {
  try {
    const response = await fetch(SALE_VIDEO_URL, { method: "HEAD" });
    const contentType = response.headers.get("content-type") ?? "";

    return response.ok && contentType.startsWith("video/") ? SALE_VIDEO_URL : null;
  } catch {
    return null;
  }
};

export const subscribeToSalesEvents = (onEvent) => {
  const handleEvent = (event) => onEvent(toNewSale(event));

  if (isMockEnabled()) {
    return subscribeToMockSalesEvents(handleEvent);
  }

  const eventSource = new EventSource(`${getApiUrl()}/sales/events`);
  eventSource.onmessage = (message) => handleEvent(JSON.parse(message.data));

  return () => eventSource.close();
};
