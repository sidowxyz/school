// Plain helpers shared by the role dashboards (kept apart from components for fast refresh).

/** Pastel fills, in the order tiles, avatars and chart slices use them. */
export const TILE_FILLS = ['bg-tile-pink', 'bg-tile-yellow', 'bg-tile-blue', 'bg-tile-violet', 'bg-tile-green'];
export const TILE_HSL = ['hsl(var(--tile-yellow))', 'hsl(var(--tile-pink))', 'hsl(var(--tile-blue))', 'hsl(var(--tile-violet))', 'hsl(var(--tile-green))'];

export const money = (n: number) => `$${(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
export const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function timeAgo(dateInput: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(dateInput).getTime()) / 1000);
  if (isNaN(seconds) || seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
