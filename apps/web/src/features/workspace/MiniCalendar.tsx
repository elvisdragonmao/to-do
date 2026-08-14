import { addDays, startOfSprint, type Task } from "@em-todo/shared";
import { useDroppable } from "@dnd-kit/core";
import { useEffect, useState, type CSSProperties } from "react";

import { calendarGrid, formatMonth, sameMonth } from "../../shared/utils/date-format.js";
import { Icon } from "../../icons.js";
import type { PlacementTarget } from "./workspace-model.js";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function MiniCalendar({
	dragActive = false,
	interactive = true,
	onSelectSprint,
	sprintStart,
	tasks
}: {
	dragActive?: boolean;
	interactive?: boolean;
	onSelectSprint: (sprintStart: string) => void;
	sprintStart: string;
	tasks: Task[];
}) {
	const [anchor, setAnchor] = useState(sprintStart);
	useEffect(() => setAnchor(sprintStart), [sprintStart]);
	const dates = calendarGrid(anchor);
	const sprintEnd = addDays(sprintStart, 6);
	const cleared = tasks.length > 0 && tasks.every(task => task.status === "DONE");
	const selectedWeek = Math.max(0, Math.floor(dates.findIndex(date => date === sprintStart) / 7));
	const gridStyle = { "--calendar-week": selectedWeek } as CSSProperties;

	return (
		<section aria-label="月份" className={`mini-calendar${dragActive ? " is-drag-target" : ""}`} data-sprint-start={sprintStart}>
			<header>
				<button aria-label="上個月" className="mini-calendar__arrow" disabled={!interactive} onClick={() => setAnchor(changeMonth(anchor, -1))} type="button">
					<Icon name="chevronLeft" />
				</button>
				<strong className="mini-calendar__month">{formatMonth(anchor)}</strong>
				<button aria-label="下個月" className="mini-calendar__arrow" disabled={!interactive} onClick={() => setAnchor(changeMonth(anchor, 1))} type="button">
					<Icon name="chevronRight" />
				</button>
			</header>
			<div className={`mini-calendar__grid${cleared ? " is-cleared" : ""}`} role="grid" style={gridStyle}>
				{WEEKDAYS.map((day, index) => (
					<span aria-hidden="true" className="mini-calendar__weekday" key={`${day}-${index}`}>
						<span>{day}</span>
					</span>
				))}
				<span aria-hidden="true" className="mini-calendar__selection" />
				{dates.map(date => (
					<CalendarDay
						anchor={anchor}
						cleared={cleared}
						date={date}
						dropEnabled={dragActive}
						interactive={interactive}
						key={date}
						onSelectSprint={onSelectSprint}
						sprintEnd={sprintEnd}
						sprintStart={sprintStart}
					/>
				))}
			</div>
		</section>
	);
}

function CalendarDay({
	anchor,
	cleared,
	date,
	dropEnabled,
	interactive,
	onSelectSprint,
	sprintEnd,
	sprintStart
}: {
	anchor: string;
	cleared: boolean;
	date: string;
	dropEnabled: boolean;
	interactive: boolean;
	onSelectSprint: (sprintStart: string) => void;
	sprintEnd: string;
	sprintStart: string;
}) {
	const target: PlacementTarget = {
		id: `calendar:${date}`,
		kind: "day",
		label: date,
		scheduledDate: date,
		sprintStart: startOfSprint(date)
	};
	const { isOver, setNodeRef } = useDroppable({
		id: target.id,
		data: { type: "calendar-day", target },
		disabled: !dropEnabled
	});
	const inSprint = date >= sprintStart && date <= sprintEnd;

	return (
		<button
			aria-label={dropEnabled ? `排到 ${date}` : date}
			aria-pressed={inSprint}
			className={`${sameMonth(date, anchor) ? "" : "is-outside"}${inSprint ? " is-current-sprint" : ""}${inSprint && cleared ? " is-cleared" : ""}${dropEnabled ? " is-drop-enabled" : ""}${isOver ? " is-drop-over" : ""}`}
			data-calendar-date={date}
			disabled={!interactive}
			onClick={() => onSelectSprint(startOfSprint(date))}
			ref={setNodeRef}
			role="gridcell"
			type="button"
		>
			<span>{Number(date.slice(8))}</span>
		</button>
	);
}

function changeMonth(value: string, amount: number): string {
	const date = new Date(`${value}T12:00:00Z`);
	date.setUTCDate(1);
	date.setUTCMonth(date.getUTCMonth() + amount);
	return date.toISOString().slice(0, 10);
}
