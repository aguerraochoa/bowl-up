export const APP_TIME_ZONE = 'America/Monterrey';

export const getTodayDateInAppTimeZone = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';

  return `${year}-${month}-${day}`;
};

export const formatAppDate = (dateValue: string, locale?: string): string => {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const utcNoon = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
    return new Intl.DateTimeFormat(locale, { timeZone: APP_TIME_ZONE }).format(utcNoon);
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(locale, { timeZone: APP_TIME_ZONE }).format(parsed);
};
