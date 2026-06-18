export function formatRupiah(
  value: number | string | null | undefined,
  withPrefix = true,
): string {
  const n = typeof value === 'string' ? parseInt(value || '0', 10) : value ?? 0;
  const safe = Number.isFinite(n as number) ? (n as number) : 0;
  const formatted = safe.toLocaleString('id-ID');
  return withPrefix ? `Rp ${formatted}` : formatted;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
