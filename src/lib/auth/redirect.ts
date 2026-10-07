/** Accept app-relative paths only; untrusted login links cannot redirect to another origin. */
export function safeNext(value: string | null | undefined, fallback = "/home") {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (
    [...value].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)
  )
    return fallback;
  return value;
}
