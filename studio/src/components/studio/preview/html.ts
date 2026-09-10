/** Strip the outer <p> so clause HTML sits inside an <li> cleanly. */
export function stripP(html: string): string {
  return html
    .replace(/^\s*<p[^>]*>/i, "")
    .replace(/<\/p>\s*$/i, "")
    .replace(/<\/p>\s*<p[^>]*>/gi, "<br/>");
}

/**
 * Inverse of `stripP`, so editing a clause inline in the Terms list round-trips
 * back to `bodyHtml` without permanently flattening its paragraphs.
 */
export function rewrapP(html: string): string {
  const t = html.trim();
  if (!t) return "<p></p>";
  if (/^<(p|ul|ol|h[1-6]|div|blockquote)\b/i.test(t)) return t;
  return `<p>${t.replace(/<br\s*\/?>/gi, "</p><p>")}</p>`;
}
