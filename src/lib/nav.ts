/**
 * Determine whether a nav item should render as active for the current path.
 *
 * A nav item is active when the current path matches its base route.
 * Query-string shortcuts (e.g. `/devices?filter=energy`) are just filtered
 * entry points into an existing section — they must NOT claim their own
 * highlight, otherwise several items light up at once for the same page.
 */
export function computeActive(href: string, pathname: string): boolean {
  const base = href.split("?")[0];
  if (base === "/") return pathname === "/";
  if (href.includes("?")) return false;
  return pathname === base || pathname.startsWith(base + "/");
}
