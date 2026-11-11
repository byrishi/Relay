export const PUBLIC_SERVER = 'https://relay.rishishah.in';

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${u[i]}`;
}
