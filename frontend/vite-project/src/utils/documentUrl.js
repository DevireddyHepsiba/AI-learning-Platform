export const resolveDocumentUrl = (rawUrl, options = {}) => {
  const value = String(rawUrl || "").trim();
  if (!value) return "";

  const apiBase = String(options.apiBase || "").replace(/\/+$/, "");
  const fallbackApiBase = String(
    options.fallbackApiBase || "http://localhost:8000"
  ).replace(/\/+$/, "");
  const currentOrigin =
    options.currentOrigin ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const isLocalhostOrigin = (url) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url);

  const isDeployedClient = Boolean(currentOrigin) && !isLocalhostOrigin(currentOrigin);

  const effectiveApiBase =
    !apiBase || (isDeployedClient && isLocalhostOrigin(apiBase))
      ? fallbackApiBase
      : apiBase;

  const joinWithApiBase = (pathname) => {
    if (!effectiveApiBase) return pathname;
    return `${effectiveApiBase}${pathname}`;
  };

  if (value.startsWith("data:")) {
    return value;
  }

  if (/^https?:\/\/localhost:\d+/i.test(value) && value.includes("/uploads/documents/")) {
    try {
      return joinWithApiBase(new URL(value).pathname);
    } catch {
      // fall through to remaining rules
    }
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    if (currentOrigin && value.startsWith(currentOrigin) && value.includes("/uploads/documents/")) {
      try {
        return joinWithApiBase(new URL(value).pathname);
      } catch {
        // fall through to raw URL
      }
    }

    return value;
  }

  if (value.startsWith("/")) {
    return effectiveApiBase ? `${effectiveApiBase}${value}` : value;
  }

  if (!value.includes("/")) {
    return effectiveApiBase
      ? `${effectiveApiBase}/uploads/documents/${value}`
      : `/uploads/documents/${value}`;
  }

  if (value.includes("uploads/documents/")) {
    const normalizedPath = `/${value.replace(/^\/+/, "")}`;
    return effectiveApiBase ? `${effectiveApiBase}${normalizedPath}` : normalizedPath;
  }

  return effectiveApiBase
    ? `${effectiveApiBase}/uploads/documents/${value}`
    : `/uploads/documents/${value}`;
};
