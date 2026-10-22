import api from "../../../shared/apiClient.js";
import { isMockEnabled } from "../../../shared/utils/isMockEnabled";

import {
  getMockScoreboard,
  getMockSdrRanking,
  getMockVendorRanking,
  goalMock,
  subscribeToMockSalesEvents,
  withMockDelay,
} from "./dashboardMocks";

export const SALE_VIDEO_URL = "/sale-video.mp4";

export const getGoal = async () => {
  if (isMockEnabled()) {
    return withMockDelay(goalMock);
  }

  const response = await api.get("/analytics/goal");
  return response.data.data;
};

export const getScoreboard = async (period) => {
  const teams = isMockEnabled()
    ? await withMockDelay(getMockScoreboard(period))
    : (await api.get("/analytics/scoreboard", { params: { period } })).data.data;

  return teams.map((team) => ({ ...team, id: team.teamId }));
};

export const getVendorRanking = async (period, department) => {
  const vendors = isMockEnabled()
    ? await withMockDelay(getMockVendorRanking(period, department))
    : (await api.get("/analytics/ranking", { params: { period, vendorDepartment: department } })).data.data.vendor;

  return vendors.map((vendor) => ({ ...vendor, id: vendor.vendorId }));
};

export const getSdrRanking = async (period) => {
  const sdrs = isMockEnabled()
    ? await withMockDelay(getMockSdrRanking(period))
    : (await api.get("/analytics/sdr-ranking", { params: { period } })).data.data;

  return sdrs.map((sdr) => ({ ...sdr, id: sdr.sdrId }));
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
    assist: event.sdr
      ? {
          name: event.sdr.name,
          job: event.sdr.job,
          imageUrl: event.sdr.imageUrl,
        }
      : null,
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

  const eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/sales/events`);
  eventSource.onmessage = (message) => handleEvent(JSON.parse(message.data));

  return () => eventSource.close();
};
