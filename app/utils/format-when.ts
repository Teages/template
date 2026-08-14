/**
 * Format an ISO timestamp for display in UTC.
 *
 * `timeZone: 'UTC'` is required for hydration safety: SSR formats with the
 * server's timezone and the client with the browser's, so any other setting
 * makes the rendered `<time>` text mismatch whenever the two differ.
 */
export function formatWhen(
  iso: string,
  timeStyle: 'short' | 'medium' = 'short',
): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle,
    timeZone: 'UTC',
  }).format(new Date(iso))
}
