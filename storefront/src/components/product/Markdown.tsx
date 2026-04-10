"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/**
 * Shared markdown renderer for editorial long-form content (company bio,
 * business model, moat, risks, etc). Supports GitHub-flavoured markdown —
 * headings, tables, lists, links, code, blockquotes, images, strikethrough.
 *
 * Styled for the light storefront theme. Keep class overrides here so admin
 * preview and storefront render stay visually identical.
 */
const components: Components = {
  h1: ({ node, ...props }) => (
    <h3 className="text-lg font-bold text-slate-900 mt-5 mb-2" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h3 className="text-base font-bold text-slate-900 mt-5 mb-2" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h4 className="text-sm font-bold text-slate-900 mt-4 mb-1.5" {...props} />
  ),
  h4: ({ node, ...props }) => (
    <h5 className="text-sm font-semibold text-slate-800 mt-3 mb-1" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="text-sm text-slate-700 leading-relaxed my-2" {...props} />
  ),
  a: ({ node, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-emerald-700 font-medium underline underline-offset-2 hover:text-emerald-800"
      {...props}
    />
  ),
  ul: ({ node, ...props }) => (
    <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700 my-2" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal ml-5 space-y-1 text-sm text-slate-700 my-2" {...props} />
  ),
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="border-l-4 border-emerald-200 bg-emerald-50/40 pl-4 py-1 my-3 text-sm text-slate-700 italic rounded-r"
      {...props}
    />
  ),
  code: ({ node, className, children, ...props }) => {
    const isBlock = /language-/.test(className || "");
    if (isBlock) {
      return (
        <code className="block text-xs font-mono text-slate-800" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="px-1 py-0.5 rounded bg-slate-100 text-slate-800 text-[0.85em] font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ node, ...props }) => (
    <pre
      className="my-3 p-3 rounded-lg bg-slate-50 border border-slate-100 overflow-x-auto text-xs"
      {...props}
    />
  ),
  table: ({ node, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-xs text-left border-collapse" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => <thead className="bg-slate-50" {...props} />,
  th: ({ node, ...props }) => (
    <th
      className="px-3 py-2 font-bold text-slate-900 border-b border-slate-200"
      {...props}
    />
  ),
  td: ({ node, ...props }) => (
    <td className="px-3 py-2 text-slate-700 border-b border-slate-100 align-top" {...props} />
  ),
  hr: () => <hr className="my-4 border-slate-100" />,
  img: ({ node, src, alt, ...props }) => (
    <figure className="my-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={typeof src === "string" ? src : undefined}
        alt={alt || ""}
        className="w-full h-auto rounded-xl border border-slate-100"
        loading="lazy"
        referrerPolicy="no-referrer"
        {...props}
      />
      {alt && (
        <figcaption className="mt-2 text-xs text-slate-500 text-center">{alt}</figcaption>
      )}
    </figure>
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-bold text-slate-900" {...props} />
  ),
  em: ({ node, ...props }) => <em className="italic" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  if (!children) return null;
  return (
    <div className="company-bio">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
