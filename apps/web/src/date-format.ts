import { addDays } from "@em-todo/shared";

const weekdayFormatter = new Intl.DateTimeFormat("zh-TW", {
	weekday: "short",
	timeZone: "UTC"
});
const monthDayFormatter = new Intl.DateTimeFormat("zh-TW", {
	month: "numeric",
	day: "numeric",
	timeZone: "UTC"
});
const fullDateFormatter = new Intl.DateTimeFormat("zh-TW", {
	year: "numeric",
	month: "long",
	day: "numeric",
	weekday: "short",
	timeZone: "UTC"
});
const monthFormatter = new Intl.DateTimeFormat("en", {
	month: "long",
	timeZone: "UTC"
});

export function formatSprintRange(sprintStart: string): string {
	return `${monthDayFormatter.format(asUtcDate(sprintStart))} – ${monthDayFormatter.format(asUtcDate(addDays(sprintStart, 6)))}`;
}

export function formatSprintLabel(sprintStart: string): string {
	return `${asUtcDate(sprintStart).getUTCFullYear()} · ${formatSprintRange(sprintStart)}`;
}

export function formatDay(date: string): { weekday: string; date: string; full: string } {
	const parsed = asUtcDate(date);
	return {
		weekday: weekdayFormatter.format(parsed),
		date: monthDayFormatter.format(parsed),
		full: fullDateFormatter.format(parsed)
	};
}

export function isToday(date: string): boolean {
	const now = new Date();
	const local = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
	return date === local;
}

export function formatShortDate(date: string): string {
	return monthDayFormatter.format(asUtcDate(date));
}

export function formatMonth(date: string): string {
	return monthFormatter.format(asUtcDate(date));
}

export function parseCompactDate(value: string): string | null {
	const digits = value.replace(/\D/g, "");
	if (digits.length !== 8) return null;
	const candidate = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
	const parsed = asUtcDate(candidate);
	return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== candidate ? null : candidate;
}

export function calendarGrid(anchor: string): string[] {
	const date = asUtcDate(anchor);
	const first = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
	const start = startOfCalendarWeek(first);
	return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function sameMonth(left: string, right: string): boolean {
	return left.slice(0, 7) === right.slice(0, 7);
}

function startOfCalendarWeek(value: string): string {
	const date = asUtcDate(value);
	const weekday = date.getUTCDay();
	return addDays(value, weekday === 0 ? -6 : 1 - weekday);
}

function asUtcDate(date: string): Date {
	return new Date(`${date}T12:00:00Z`);
}
