const HAS_PROTOCOL = /^https?:\/\//i;
const HAS_OTHER_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function toCompanyUrl(text) {
  const value = String(text ?? "").trim();

  if (!value || /\s/.test(value)) {
    return null;
  }

  if (!HAS_PROTOCOL.test(value) && HAS_OTHER_SCHEME.test(value) && !/^[^:/]+:\d/.test(value)) {
    return null;
  }

  try {
    const url = new URL(HAS_PROTOCOL.test(value) ? value : `https://${value}`);
    const isWebUrl = url.protocol === "https:" || url.protocol === "http:";

    return isWebUrl && url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}
