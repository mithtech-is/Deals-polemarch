export function parseFinancialInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/,/g, '');
  const parenMatch = normalized.match(/^\(\s*(.+?)\s*\)$/);
  const numericText = parenMatch ? parenMatch[1] : normalized;
  const value = Number(numericText);
  if (!Number.isFinite(value)) return null;
  if (parenMatch) return -Math.abs(value);
  return value;
}

export function formatReadOnlyFinancialValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  if (value < 0) return `(${Math.abs(value).toFixed(2)})`;
  return String(value);
}
