export const resolveDocumentUrl = (rawUrl, options = {}) => {
  const value = String(rawUrl || "").trim();
  if (!value) return "";

  const apiBase = String(options.apiBase || "").replace(/\/+$/, "");
  const currentOrigin =
    options.currentOrigin ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const joinWithApiBase = (pathname) => {
    if (!apiBase) return pathname;
    return `${apiBase}${pathname}`;
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
    return apiBase ? `${apiBase}${value}` : value;
  }

  if (!value.includes("/")) {
    return apiBase
      ? `${apiBase}/uploads/documents/${value}`
      : `/uploads/documents/${value}`;
  }

  if (value.includes("uploads/documents/")) {
    const normalizedPath = `/${value.replace(/^\/+/, "")}`;
    return apiBase ? `${apiBase}${normalizedPath}` : normalizedPath;
  }

  return apiBase
    ? `${apiBase}/uploads/documents/${value}`
    : `/uploads/documents/${value}`;
};
