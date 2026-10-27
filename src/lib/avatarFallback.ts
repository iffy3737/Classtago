export function initialsAvatar(name?: string | null): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const first = parts.length ? parts[0].charAt(0) : '?';
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  const initials = (first + last).toUpperCase().replace(/[<>&"']/g, '');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="160" height="160" fill="url(#g)"/><text x="80" y="80" dy=".35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="700" fill="#ffffff">' + initials + '</text></svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
