// Minimal Lexical JSON → HTML renderer.
// Handles the subset of Payload's default Lexical editor output we need:
// paragraphs, headings, bold/italic/underline/strike/code, links, lists, quotes, line breaks.
// Deliberately self-contained — avoids pinning to @payloadcms/richtext-lexical's HTML
// exports which move between minor versions.

type LexicalNode = {
  type?: string
  tag?: string
  format?: number | string
  text?: string
  url?: string
  listType?: string
  children?: LexicalNode[]
  [k: string]: unknown
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Bitmask flags used by Lexical TextNode.format
const FORMAT = {
  BOLD: 1,
  ITALIC: 1 << 1,
  STRIKETHROUGH: 1 << 2,
  UNDERLINE: 1 << 3,
  CODE: 1 << 4,
  SUBSCRIPT: 1 << 5,
  SUPERSCRIPT: 1 << 6,
}

const wrapText = (text: string, format: number): string => {
  let out = escapeHtml(text).replace(/\n/g, '<br />')
  if (format & FORMAT.CODE) out = `<code>${out}</code>`
  if (format & FORMAT.BOLD) out = `<strong>${out}</strong>`
  if (format & FORMAT.ITALIC) out = `<em>${out}</em>`
  if (format & FORMAT.UNDERLINE) out = `<u>${out}</u>`
  if (format & FORMAT.STRIKETHROUGH) out = `<s>${out}</s>`
  if (format & FORMAT.SUBSCRIPT) out = `<sub>${out}</sub>`
  if (format & FORMAT.SUPERSCRIPT) out = `<sup>${out}</sup>`
  return out
}

const renderChildren = (children?: LexicalNode[]): string =>
  (children ?? []).map(renderNode).join('')

const renderNode = (node: LexicalNode): string => {
  if (!node || typeof node !== 'object') return ''

  switch (node.type) {
    case 'text': {
      const fmt = typeof node.format === 'number' ? node.format : 0
      return wrapText(String(node.text ?? ''), fmt)
    }
    case 'linebreak':
      return '<br />'
    case 'paragraph': {
      const inner = renderChildren(node.children)
      return inner ? `<p>${inner}</p>` : ''
    }
    case 'heading': {
      const level = /^h[1-6]$/.test(String(node.tag)) ? node.tag : 'h2'
      return `<${level}>${renderChildren(node.children)}</${level}>`
    }
    case 'quote':
      return `<blockquote>${renderChildren(node.children)}</blockquote>`
    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul'
      return `<${tag}>${renderChildren(node.children)}</${tag}>`
    }
    case 'listitem':
      return `<li>${renderChildren(node.children)}</li>`
    case 'link':
    case 'autolink': {
      const url = typeof node.url === 'string' ? escapeHtml(node.url) : '#'
      return `<a href="${url}" rel="noopener noreferrer">${renderChildren(node.children)}</a>`
    }
    case 'horizontalrule':
      return '<hr />'
    case 'upload': {
      // Image upload node — try to surface the URL if present.
      const value = node.value as { url?: string; alt?: string } | undefined
      if (value?.url) {
        return `<img src="${escapeHtml(value.url)}" alt="${escapeHtml(value.alt ?? '')}" />`
      }
      return ''
    }
    case 'root':
      return renderChildren(node.children)
    default:
      // Unknown node — render children if present so we don't drop content.
      return renderChildren(node.children)
  }
}

export const lexicalToHtml = (body: unknown): string => {
  if (!body || typeof body !== 'object') return ''
  const root = (body as { root?: LexicalNode }).root
  if (!root) return ''
  return renderNode(root)
}
