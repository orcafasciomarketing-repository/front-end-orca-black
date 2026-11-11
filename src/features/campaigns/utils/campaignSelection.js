import { useSyncExternalStore } from "react";

const STORAGE_KEY = "admin-campaign";

const readStored = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
};

let selected = readStored();
const listeners = new Set();

export const getSelectedCampaign = () => selected;

export const setSelectedCampaign = (id) => {
  const next = id ? String(id) : "";
  if (next === selected) return;
  selected = next;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, next);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sem armazenamento: a escolha vale só nesta aba
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useSelectedCampaign() {
  return useSyncExternalStore(subscribe, getSelectedCampaign, () => "");
}

export const campaignKey = (campaignId) => campaignId || "active";

export const campaignParams = (campaignId) => (campaignId ? { campaign: campaignId } : {});
