import api from "./apiClient.js";
import { isMockEnabled } from "./utils/isMockEnabled";

const LOCAL_LOGS_KEY = "error-logs";
const LOCAL_LOGS_LIMIT = 100;

export function buildErrorLog(error, { location, componentStack } = {}) {
  return {
    level: "error",
    message: error?.message ?? String(error),
    stack: error?.stack ?? null,
    componentStack: componentStack ?? null,
    location: location ?? "Desconhecido",
    url: window.location.href,
    userAgent: window.navigator.userAgent,
    occurredAt: new Date().toISOString(),
  };
}

export function getLocalErrorLogs() {
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_LOGS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveLocalErrorLog(log) {
  try {
    const logs = [{ ...log, _id: crypto.randomUUID() }, ...getLocalErrorLogs()].slice(0, LOCAL_LOGS_LIMIT);
    window.localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs));
  } catch {
    return;
  }
}

export async function reportError(error, context) {
  const log = buildErrorLog(error, context);

  console.error(`[${log.location}]`, error);

  if (isMockEnabled()) {
    saveLocalErrorLog(log);
    return;
  }

  try {
    await api.post("/logs", log);
  } catch {
    saveLocalErrorLog(log);
  }
}

export function installGlobalErrorHandlers() {
  const handleError = (event) => {
    reportError(event.error ?? new Error(event.message), {
      location: `Global (${event.filename ?? "arquivo desconhecido"}:${event.lineno ?? "?"})`,
    });
  };

  const handleRejection = (event) => {
    reportError(event.reason, { location: "Promise sem tratamento" });
  };

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
  };
}
