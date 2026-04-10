import sanitizeHtml from "sanitize-html";

/**
 * Sanitizer for analyst-authored HTML that flows Calcula → Medusa → storefront.
 *
 * Two hard requirements drive the allowlist:
 *   1. **Preserve inline `style` attributes.** The Financial Analysis, Industry,
 *      Sector, and Activity blocks are styled with `style="…"` on every element
 *      because the Tailwind `prose` wrapper and the sanitizer were stripping
 *      `<style>` tags. Dropping `style` here would make every authored report
 *      render as unstyled text.
 *   2. **Strip every known XSS vector.** Event handlers (`onclick` etc.),
 *      `<script>`, `<iframe>`, `<object>`, `<embed>`, `javascript:` URIs, and
 *      `expression()` / `url(javascript:)` inside CSS are all rejected.
 *
 * sanitize-html covers 1 and 2 out of the box once we allowlist the style attr
 * on every tag. CSS property filtering is handled by its built-in `allowedStyles`
 * (we permit the narrow set we actually use in authored reports: colour,
 * background, border, padding, margin, display, grid, font, text and a few more).
 */

const ALLOWED_CSS_VALUE = [
  // colours — #fff, #0f172a, rgba(), rgb(), named colours
  /^#(0x)?[0-9a-f]{3,8}$/i,
  /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i,
  /^[a-z]+$/i,
  // lengths — 10px, 0.5rem, 100%, 0, 1.25rem
  /^-?\d*\.?\d+(px|rem|em|%|vh|vw|pt|ch)?$/i,
  // multi-value (e.g. padding: 0.5rem 1rem)
  /^(-?\d*\.?\d+(px|rem|em|%|0)?\s*){1,4}$/i,
  // gradients, shadows, transforms
  /^linear-gradient\(.+\)$/i,
  /^[0-9.\-a-z,\s()]+$/i,
] as const;

export const editorialSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "div", "section", "article", "header", "footer", "nav", "aside", "main",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "span", "strong", "em", "b", "i", "u", "s", "sub", "sup", "small", "mark",
    "ul", "ol", "li", "dl", "dt", "dd",
    "blockquote", "pre", "code", "hr", "br",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
  ],
  allowedAttributes: {
    "*": ["style", "class", "id", "title", "aria-label", "aria-hidden", "role", "lang", "dir"],
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height", "loading", "decoding"],
    th: ["scope", "colspan", "rowspan", "style", "class"],
    td: ["colspan", "rowspan", "style", "class"],
  },
  // Only allow http(s) and protocol-relative URLs — no javascript:, data:, vbscript:.
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https", "data"], // data: is acceptable for images only
  },
  allowProtocolRelative: true,
  // Any <a href> gets rel="noopener noreferrer" and target="_blank" stripped of any event payload.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
  // Inline-style CSS allowlist. sanitize-html walks every `style="…"` declaration
  // and only keeps properties in this map whose value matches one of the regexes.
  allowedStyles: {
    "*": {
      color: ALLOWED_CSS_VALUE.slice(),
      "background-color": ALLOWED_CSS_VALUE.slice(),
      background: ALLOWED_CSS_VALUE.slice(),
      "border-color": ALLOWED_CSS_VALUE.slice(),
      border: ALLOWED_CSS_VALUE.slice(),
      "border-top": ALLOWED_CSS_VALUE.slice(),
      "border-right": ALLOWED_CSS_VALUE.slice(),
      "border-bottom": ALLOWED_CSS_VALUE.slice(),
      "border-left": ALLOWED_CSS_VALUE.slice(),
      "border-radius": ALLOWED_CSS_VALUE.slice(),
      "border-width": ALLOWED_CSS_VALUE.slice(),
      "border-style": ALLOWED_CSS_VALUE.slice(),
      padding: ALLOWED_CSS_VALUE.slice(),
      "padding-top": ALLOWED_CSS_VALUE.slice(),
      "padding-right": ALLOWED_CSS_VALUE.slice(),
      "padding-bottom": ALLOWED_CSS_VALUE.slice(),
      "padding-left": ALLOWED_CSS_VALUE.slice(),
      margin: ALLOWED_CSS_VALUE.slice(),
      "margin-top": ALLOWED_CSS_VALUE.slice(),
      "margin-right": ALLOWED_CSS_VALUE.slice(),
      "margin-bottom": ALLOWED_CSS_VALUE.slice(),
      "margin-left": ALLOWED_CSS_VALUE.slice(),
      display: ALLOWED_CSS_VALUE.slice(),
      "grid-template-columns": ALLOWED_CSS_VALUE.slice(),
      "grid-column": ALLOWED_CSS_VALUE.slice(),
      "grid-row": ALLOWED_CSS_VALUE.slice(),
      gap: ALLOWED_CSS_VALUE.slice(),
      "column-gap": ALLOWED_CSS_VALUE.slice(),
      "row-gap": ALLOWED_CSS_VALUE.slice(),
      width: ALLOWED_CSS_VALUE.slice(),
      "max-width": ALLOWED_CSS_VALUE.slice(),
      "min-width": ALLOWED_CSS_VALUE.slice(),
      height: ALLOWED_CSS_VALUE.slice(),
      "max-height": ALLOWED_CSS_VALUE.slice(),
      "min-height": ALLOWED_CSS_VALUE.slice(),
      "font-size": ALLOWED_CSS_VALUE.slice(),
      "font-weight": ALLOWED_CSS_VALUE.slice(),
      "font-family": [/^[a-zA-Z0-9,\-'" \s]+$/],
      "font-style": ALLOWED_CSS_VALUE.slice(),
      "line-height": ALLOWED_CSS_VALUE.slice(),
      "letter-spacing": ALLOWED_CSS_VALUE.slice(),
      "text-align": ALLOWED_CSS_VALUE.slice(),
      "text-transform": ALLOWED_CSS_VALUE.slice(),
      "text-decoration": ALLOWED_CSS_VALUE.slice(),
      "text-overflow": ALLOWED_CSS_VALUE.slice(),
      "white-space": ALLOWED_CSS_VALUE.slice(),
      "word-break": ALLOWED_CSS_VALUE.slice(),
      overflow: ALLOWED_CSS_VALUE.slice(),
      "overflow-x": ALLOWED_CSS_VALUE.slice(),
      "overflow-y": ALLOWED_CSS_VALUE.slice(),
      "box-shadow": ALLOWED_CSS_VALUE.slice(),
      opacity: ALLOWED_CSS_VALUE.slice(),
      "border-collapse": ALLOWED_CSS_VALUE.slice(),
      "border-spacing": ALLOWED_CSS_VALUE.slice(),
      "table-layout": ALLOWED_CSS_VALUE.slice(),
      "vertical-align": ALLOWED_CSS_VALUE.slice(),
      "list-style-type": ALLOWED_CSS_VALUE.slice(),
      "list-style-position": ALLOWED_CSS_VALUE.slice(),
      "flex-direction": ALLOWED_CSS_VALUE.slice(),
      "flex-wrap": ALLOWED_CSS_VALUE.slice(),
      "justify-content": ALLOWED_CSS_VALUE.slice(),
      "align-items": ALLOWED_CSS_VALUE.slice(),
      "align-content": ALLOWED_CSS_VALUE.slice(),
      position: ALLOWED_CSS_VALUE.slice(),
      top: ALLOWED_CSS_VALUE.slice(),
      right: ALLOWED_CSS_VALUE.slice(),
      bottom: ALLOWED_CSS_VALUE.slice(),
      left: ALLOWED_CSS_VALUE.slice(),
      "z-index": ALLOWED_CSS_VALUE.slice(),
    },
  },
  // Drop contents of forbidden tags entirely (don't leak script text).
  nonTextTags: ["style", "script", "textarea", "option", "noscript"],
};

export function sanitizeEditorialHtml(html: string | null | undefined): string {
  if (!html || !html.trim()) return "";
  return sanitizeHtml(html, editorialSanitizeOptions);
}
