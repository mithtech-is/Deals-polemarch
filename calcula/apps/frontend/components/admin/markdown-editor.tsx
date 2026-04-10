'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

/**
 * Lightweight WYSIWYG-ish markdown editor used across admin editorial forms.
 * Textarea + toolbar that inserts markdown syntax at the cursor, plus a
 * live-preview pane that mirrors the storefront render pipeline
 * (react-markdown + remark-gfm + rehype-sanitize) so authors see the real
 * output before saving.
 */

type Props = {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
};

type ToolbarAction = {
  key: string;
  label: string;
  title: string;
  apply: (sel: string) => { insert: string; cursorOffset?: number };
};

const actions: ToolbarAction[] = [
  {
    key: 'h2',
    label: 'H2',
    title: 'Heading',
    apply: (s) => ({ insert: `## ${s || 'Heading'}` }),
  },
  {
    key: 'h3',
    label: 'H3',
    title: 'Sub-heading',
    apply: (s) => ({ insert: `### ${s || 'Sub-heading'}` }),
  },
  {
    key: 'b',
    label: 'B',
    title: 'Bold',
    apply: (s) => ({ insert: `**${s || 'bold'}**`, cursorOffset: s ? 0 : -2 }),
  },
  {
    key: 'i',
    label: 'I',
    title: 'Italic',
    apply: (s) => ({ insert: `*${s || 'italic'}*`, cursorOffset: s ? 0 : -1 }),
  },
  {
    key: 'link',
    label: '🔗',
    title: 'Link',
    apply: (s) => ({ insert: `[${s || 'text'}](https://)`, cursorOffset: -1 }),
  },
  {
    key: 'ul',
    label: '• List',
    title: 'Bulleted list',
    apply: (s) =>
      s
        ? { insert: s.split(/\r?\n/).map((l) => `- ${l}`).join('\n') }
        : { insert: `- item 1\n- item 2\n- item 3` },
  },
  {
    key: 'ol',
    label: '1. List',
    title: 'Numbered list',
    apply: (s) =>
      s
        ? { insert: s.split(/\r?\n/).map((l, i) => `${i + 1}. ${l}`).join('\n') }
        : { insert: `1. first\n2. second\n3. third` },
  },
  {
    key: 'quote',
    label: '❝',
    title: 'Blockquote',
    apply: (s) => ({ insert: `> ${s || 'quote'}` }),
  },
  {
    key: 'code',
    label: '</>',
    title: 'Inline code',
    apply: (s) => ({ insert: `\`${s || 'code'}\`` }),
  },
  {
    key: 'table',
    label: '▦',
    title: 'Table',
    apply: () => ({
      insert: `| Column A | Column B |\n| --- | --- |\n| row 1 | value |\n| row 2 | value |`,
    }),
  },
  {
    key: 'img',
    label: '🖼',
    title: 'Image',
    apply: (s) => ({ insert: `![${s || 'alt text'}](https://)`, cursorOffset: -1 }),
  },
  {
    key: 'hr',
    label: '―',
    title: 'Divider',
    apply: () => ({ insert: `\n---\n` }),
  },
];

const components: Components = {
  h1: (p) => <h3 className="text-lg font-bold text-slate-900 mt-4 mb-2" {...p} />,
  h2: (p) => <h3 className="text-base font-bold text-slate-900 mt-4 mb-2" {...p} />,
  h3: (p) => <h4 className="text-sm font-bold text-slate-900 mt-3 mb-1.5" {...p} />,
  p: (p) => <p className="text-sm text-slate-700 leading-relaxed my-2" {...p} />,
  a: ({ href, ...p }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-emerald-700 underline"
      {...p}
    />
  ),
  ul: (p) => <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700 my-2" {...p} />,
  ol: (p) => <ol className="list-decimal ml-5 space-y-1 text-sm text-slate-700 my-2" {...p} />,
  blockquote: (p) => (
    <blockquote
      className="border-l-4 border-emerald-200 bg-emerald-50 pl-3 py-1 my-2 text-sm text-slate-700 italic"
      {...p}
    />
  ),
  code: ({ className, children, ...p }) => {
    const block = /language-/.test(className || '');
    return block ? (
      <code className="block text-xs font-mono" {...p}>
        {children}
      </code>
    ) : (
      <code className="px-1 rounded bg-slate-100 text-[0.85em] font-mono" {...p}>
        {children}
      </code>
    );
  },
  pre: (p) => (
    <pre
      className="my-2 p-3 rounded bg-slate-50 border border-slate-200 overflow-x-auto text-xs"
      {...p}
    />
  ),
  table: (p) => (
    <div className="my-2 overflow-x-auto border border-slate-200 rounded">
      <table className="w-full text-xs border-collapse" {...p} />
    </div>
  ),
  thead: (p) => <thead className="bg-slate-50" {...p} />,
  th: (p) => <th className="px-2 py-1.5 font-bold border-b border-slate-200 text-left" {...p} />,
  td: (p) => <td className="px-2 py-1.5 border-b border-slate-100 align-top" {...p} />,
  hr: () => <hr className="my-3 border-slate-200" />,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === 'string' ? src : undefined}
      alt={alt || ''}
      className="my-2 max-w-full h-auto rounded border border-slate-200"
    />
  ),
  strong: (p) => <strong className="font-bold text-slate-900" {...p} />,
};

export function MarkdownEditor({ value, onChange, rows = 8, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('split');

  const apply = (action: ToolbarAction) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end);
    const { insert, cursorOffset = 0 } = action.apply(sel);
    const before = value.slice(0, start);
    const after = value.slice(end);
    // Block-level actions want a leading newline if not already at start-of-line
    const blockKeys = ['h2', 'h3', 'ul', 'ol', 'quote', 'table', 'hr'];
    const needsLeadingNL =
      blockKeys.includes(action.key) && before.length > 0 && !before.endsWith('\n\n');
    const prefix = needsLeadingNL ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const next = before + prefix + insert + after;
    onChange(next);
    // Restore focus + selection after React re-render
    requestAnimationFrame(() => {
      if (!ref.current) return;
      const caret = start + prefix.length + insert.length + cursorOffset;
      ref.current.focus();
      ref.current.setSelectionRange(caret, caret);
    });
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value);

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          padding: 6,
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          alignItems: 'center',
        }}
      >
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => apply(a)}
            title={a.title}
            style={{
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              background: '#fff',
              cursor: 'pointer',
              color: '#334155',
            }}
          >
            {a.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 2, padding: 2, background: '#e2e8f0', borderRadius: 4 }}>
          {(['edit', 'split', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 700,
                border: 'none',
                borderRadius: 3,
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Editor + Preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mode === 'split' ? '1fr 1fr' : '1fr',
          minHeight: rows * 24,
        }}
      >
        {mode !== 'preview' && (
          <textarea
            ref={ref}
            value={value}
            onChange={handleChange}
            rows={rows}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: 12,
              border: 'none',
              borderRight: mode === 'split' ? '1px solid #e2e8f0' : 'none',
              outline: 'none',
              resize: 'vertical',
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
              fontSize: 13,
              lineHeight: 1.6,
              background: '#fff',
              color: '#0f172a',
            }}
          />
        )}
        {mode !== 'edit' && (
          <div
            style={{
              padding: 12,
              background: '#fff',
              overflow: 'auto',
              minHeight: rows * 24,
            }}
          >
            {value.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={components}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic', margin: 0 }}>
                Preview will appear here…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
