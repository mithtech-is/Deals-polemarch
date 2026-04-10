"use client";

import { useEffect, useState } from "react";
import { Linkedin } from "lucide-react";
import { getSnapshot } from "@/lib/snapshot";

type Props = {
  isin: string;
};

type Member = {
  name: string;
  role: string;
  since: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  photoUrl: string | null;
};

/**
 * Stable role-based importance ranking. Lower = more important.
 * Keeps executives (Chairman, CEO, MD) above founders above other roles,
 * while preserving author-supplied order inside each bucket.
 */
function rolePriority(role: string): number {
  const r = (role || '').toLowerCase();
  if (/(chairman|chairperson)/.test(r) && /independent/.test(r) === false) return 0;
  if (/(chief executive|\bceo\b|managing director|\bmd\b|group ceo)/.test(r)) return 1;
  if (/president/.test(r)) return 2;
  if (/(chief operating|\bcoo\b)/.test(r)) return 3;
  if (/(chief financial|\bcfo\b)/.test(r)) return 4;
  if (/(chief technology|\bcto\b|chief product|\bcpo\b)/.test(r)) return 5;
  if (/chief/.test(r)) return 6;
  if (/co-?founder/.test(r)) return 7;
  if (/founder/.test(r)) return 8;
  if (/(independent director|non-?executive)/.test(r)) return 9;
  if (/(board|director|nominee)/.test(r)) return 10;
  if (/(vice president|\bvp\b|head of)/.test(r)) return 11;
  return 20;
}

/**
 * Key management team card. Renders a grid of people with avatar, name,
 * role, since-date, bio, and LinkedIn link. Curated via the calcula
 * admin Team section and delivered through the `editorial` snapshot.
 * Returns null when no members are curated so the deal page stays clean.
 */
export function TeamPanel({ isin }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSnapshot(isin, "editorial")
      .then((bundle) => {
        if (cancelled) return;
        setMembers(bundle.editorial?.team?.members ?? []);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isin]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="h-6 w-40 bg-slate-100 rounded mb-3 animate-pulse" />
        <div className="h-32 bg-slate-50 rounded animate-pulse" />
      </div>
    );
  }

  if (members.length === 0) return null;

  // Sort by role importance while keeping stable order within each bucket.
  const sorted = members
    .map((m, originalIndex) => ({ m, originalIndex, p: rolePriority(m.role) }))
    .sort((a, b) => (a.p !== b.p ? a.p - b.p : a.originalIndex - b.originalIndex))
    .map((x) => x.m);

  return (
    <article className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 mb-4">
        Key Management Team
      </h2>
      <ul className="flex flex-col gap-4">
        {sorted.map((m, idx) => (
          <li
            key={idx}
            className="flex gap-5 p-5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex-shrink-0">
              {m.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.photoUrl}
                  alt={m.name}
                  className="h-20 w-20 rounded-full object-cover border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-2xl font-bold shadow-sm">
                  {m.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {m.name}
                </h3>
                {m.linkedinUrl && (
                  <a
                    href={m.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-emerald-700"
                    aria-label={`${m.name} on LinkedIn`}
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
              </div>
              <p className="text-xs font-bold text-emerald-700 mt-1 uppercase tracking-wide">
                {m.role}
                {m.since ? (
                  <span className="text-slate-400 font-normal normal-case tracking-normal">
                    {" "}· since {m.since}
                  </span>
                ) : null}
              </p>
              {m.bio && (
                <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
                  {m.bio}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
