function toSafeDate(value: string) {
  const normalizedValue =
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const parsed = new Date(normalizedValue);

  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError("Invalid time value");
  }

  return parsed;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(toSafeDate(date));
}

export function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}
