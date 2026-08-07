/**
 * Helper to check if a user's birthday matches today's date.
 */
export function isBirthdayToday(birthday?: string): boolean {
  if (!birthday || !birthday.trim()) return false;
  const today = new Date();
  const todayMonth = today.getMonth() + 1; // 1-12
  const todayDay = today.getDate(); // 1-31

  const trimmed = birthday.trim();

  // Format: YYYY-MM-DD (standard HTML date picker)
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length >= 3) {
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      return month === todayMonth && day === todayDay;
    }
  }

  // Format: DD/MM/YYYY or MM/DD/YYYY
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length >= 2) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      return (p1 === todayDay && p2 === todayMonth) || (p1 === todayMonth && p2 === todayDay);
    }
  }

  return false;
}
