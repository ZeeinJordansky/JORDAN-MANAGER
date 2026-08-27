export function formatLargeNumber(num: number): string {
  if (num >= 1e18) return (num / 1e18).toFixed(2).replace(/\.00$/, '') + ' квинт.';
  if (num >= 1e15) return (num / 1e15).toFixed(2).replace(/\.00$/, '') + ' квадр.';
  if (num >= 1e12) return (num / 1e12).toFixed(2).replace(/\.00$/, '') + ' трлн';
  if (num >= 1e9) return (num / 1e9).toFixed(2).replace(/\.00$/, '') + ' млрд';
  if (num >= 1e6) return (num / 1e6).toFixed(2).replace(/\.00$/, '') + ' млн';
  if (num >= 1e3) return (num / 1e3).toFixed(2).replace(/\.00$/, '') + ' тыс.';
  return num.toLocaleString('ru-RU');
}
