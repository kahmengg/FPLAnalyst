export function updateUrlParams(
  changes: Record<string, string | number | null | undefined>,
) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === "")
      url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  }
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function currentUrlParams() {
  return typeof window === "undefined"
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);
}
