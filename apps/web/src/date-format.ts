import { addDays } from "@sprintly/shared";

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

function asUtcDate(date: string): Date {
	return new Date(`${date}T12:00:00Z`);
}
