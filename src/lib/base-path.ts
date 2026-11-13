// GitHub Pages serves project sites from /<repo-name>, so every hand-built URL
// (anything that isn't a next/link) has to be prefixed manually.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function boardUrl(encoded: string) {
  return `${window.location.origin}${BASE_PATH}/board/#d=${encoded}`;
}
