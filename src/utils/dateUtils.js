function isValidDateParts(day, month, year) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseBirthdateInput(value) {
  const match = /^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/.exec(value.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const today = new Date();
  const isFuture = year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth() + 1) ||
    (year === today.getFullYear() && month === today.getMonth() + 1 && day > today.getDate());

  if (isFuture || !isValidDateParts(day, month, year)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatBirthdate(value) {
  if (!value) return '';

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;

  const legacyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!legacyMatch) return value;

  const first = Number(legacyMatch[1]);
  const second = Number(legacyMatch[2]);
  if (first > 12) return `${String(first).padStart(2, '0')}/${String(second).padStart(2, '0')}/${legacyMatch[3]}`;
  return `${String(second).padStart(2, '0')}/${String(first).padStart(2, '0')}/${legacyMatch[3]}`;
}

export function getBirthYear(value) {
  if (!value) return null;
  const isoMatch = /^(\d{4})-/.exec(value);
  if (isoMatch) return Number(isoMatch[1]);
  const match = /\/(\d{4})$/.exec(formatBirthdate(value));
  return match ? Number(match[1]) : null;
}