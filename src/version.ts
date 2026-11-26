// An open tab keeps the bundle it loaded. To notice a deploy, compare that bundle
// with the one the server's index.html points to now (index.html is no-cache).
export const BUNDLE_RE = /\/assets\/index-[A-Za-z0-9_-]+\.js/
export const CHECK_EVENT = 'apibase:check-version'

export function loadedBundle(): string | null {
  const src = document.querySelector('script[type="module"][src*="/assets/index-"]')?.getAttribute('src') ?? ''
  return BUNDLE_RE.exec(src)?.[0] ?? null // null in dev (Vite serves /src/main.tsx)
}

// Ask the update banner for a check, e.g. before sending a question.
// Cheap: one small no-cache GET of index.html.
export function checkForNewVersion() {
  window.dispatchEvent(new Event(CHECK_EVENT))
}
