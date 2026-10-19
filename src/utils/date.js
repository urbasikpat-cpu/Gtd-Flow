export function getRelativeDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export function formatReadableDate(dateStr) {
  if (!dateStr) return '';
  const today = getRelativeDateString(0);
  const tomorrow = getRelativeDateString(1);
  if (dateStr === today) return '🔥 Heute';
  if (dateStr === tomorrow) return 'Morgen';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}
