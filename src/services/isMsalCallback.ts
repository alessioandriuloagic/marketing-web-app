export function isMsalCallback(url: URL): boolean {
  const hash = new URLSearchParams(url.hash.slice(1));
  return [hash, url.searchParams].some(
    (params) => params.has('state') && (params.has('code') || params.has('error'))
  );
}
