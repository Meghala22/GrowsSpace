import { BadRequestError } from "../errors";

export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function isPastDate(date: string) {
  return date < getTodayDateString();
}

export function addMinutesToTime(startTime: string, durationMinutes: number) {
  const [hoursText, minutesText] = startTime.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new BadRequestError("Start time must use HH:MM in 24-hour format.");
  }

  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const resultHours = Math.floor(normalized / 60);
  const resultMinutes = normalized % 60;

  return `${String(resultHours).padStart(2, "0")}:${String(resultMinutes).padStart(2, "0")}`;
}
