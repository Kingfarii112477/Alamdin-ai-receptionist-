const CONTROL_CHARS = new RegExp("[\\u0000-\\u001F\\u007F]", "g");

/** Strips control characters and collapses whitespace from free-text input. */
export function sanitizeText(input: string): string {
  return input.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim();
}
