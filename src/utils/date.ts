import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export const formatTime = (
  seconds: number,
  silent = false,
  format?: "short" | "timestamp",
): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (format === "short") {
    if (hours > 0) {
      return `${hours}h`;
    }
    if (minutes > 0) {
      return `${minutes}m`;
    }
    return `${remainingSeconds}s`;
  }

  // Default timestamp format
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")} ${silent ? "" : "hr"}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")} ${silent ? "" : "min"}`;
};

export const formatDateFull = (date: Date | string): string => {
  return dayjs(date).format("MMM D, YYYY, h:mm A");
};

export const formatDateShort = (date: Date | string): string => {
  return dayjs(date).format("MMM D, YYYY");
};

export const formatDateRelative = (date: Date | string): string => {
  return `${dayjs(date).fromNow()}`;
};

export const formatSecondsToMinutesAndSeconds = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }

  return `${minutes > 0 ? `${minutes}m` : ""}${seconds}s`;
};

export const getDaysOld = (createdAt: string | Date): number => {
  const today = new Date();
  return dayjs(today).diff(dayjs(createdAt), "day");
};
