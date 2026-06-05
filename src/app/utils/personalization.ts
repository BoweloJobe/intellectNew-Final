export function getTimeOfDayGreetingPrefix(now: Date = new Date()): string {
  const hour = now.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function getMinutesSince(isoDate: string | null | undefined, now: Date = new Date()): number | null {
  if (!isoDate) {
    return null;
  }

  const timestamp = new Date(isoDate).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return Math.max(0, Math.round((now.getTime() - timestamp) / (1000 * 60)));
}

export function formatRelativeTime(isoDate: string | null | undefined, now: Date = new Date()): string | null {
  if (!isoDate) {
    return null;
  }

  const minutesSince = getMinutesSince(isoDate, now);

  if (minutesSince == null) {
    return null;
  }

  if (minutesSince < 1) {
    return "just now";
  }

  if (minutesSince < 60) {
    return `${minutesSince}m ago`;
  }

  if (minutesSince < 1440) {
    return `${Math.round(minutesSince / 60)}h ago`;
  }

  if (minutesSince < 10080) {
    return `${Math.round(minutesSince / 1440)}d ago`;
  }

  return new Date(isoDate).toLocaleDateString();
}