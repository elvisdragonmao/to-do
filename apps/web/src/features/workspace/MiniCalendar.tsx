import { addDays, startOfSprint, type Task } from "@em-todo/shared";
import { useEffect, useState, type CSSProperties } from "react";

import { calendarGrid, formatMonth, sameMonth } from "../../date-format.js";
import { Icon } from "../../icons.js";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function MiniCalendar({ interactive = true, onSelectSprint, sprintStart, tasks }: { interactive?: boolean; onSelectSprint: (sprintStart: string) => void; sprintStart: string; tasks: Task[] }) {
	const [anchor, setAnchor] = useState(sprintStart);
	useEffect(() => setAnchor(sprintStart), [sprintStart]);
	const dates = calendarGrid(anchor);
	const sprintEnd = addDays(sprintStart, 6);
	const cleared = tasks.length > 0 && tasks.every(task => task.status === "DONE");
	const selectedWeek = Math.max(0, Math.floor(dates.findIndex(date => date === sprintStart) / 7));
	const gridStyle = { "--calendar-week": selectedWeek } as CSSProperties;

	return (
		<section aria-label="月份" className="mini-calendar">
			<header>
				<button aria-label="上個月" className="mini-calendar__arrow" disabled={!interactive} onClick={() => setAnchor(changeMonth(anchor, -1))} type="button">
					<Icon name="chevronLeft" />
				</button>
				<strong>{formatMonth(anchor)}</strong>
				<button aria-label="下個月" className="mini-calendar__arrow" disabled={!interactive} onClick={() => setAnchor(changeMonth(anchor, 1))} type="button">
					<Icon name="chevronRight" />
				</button>
			</header>
			<div className={`mini-calendar__grid${cleared ? " is-cleared" : ""}`} role="grid" style={gridStyle}>
				{WEEKDAYS.map((day, index) => (
					<span aria-hidden="true" className="mini-calendar__weekday" key={`${day}-${index}`}>
						{day}
					</span>
				))}
				<span aria-hidden="true" className="mini-calendar__selection" />
				{dates.map(date => {
					const inSprint = date >= sprintStart && date <= sprintEnd;
					return (
						<button
							aria-label={date}
							aria-pressed={inSprint}
							className={`${sameMonth(date, anchor) ? "" : "is-outside"}${inSprint ? " is-current-sprint" : ""}${inSprint && cleared ? " is-cleared" : ""}`}
							key={date}
							disabled={!interactive}
							onClick={() => onSelectSprint(startOfSprint(date))}
							role="gridcell"
							type="button"
						>
							{Number(date.slice(8))}
						</button>
					);
				})}
			</div>
		</section>
	);
}

function changeMonth(value: string, amount: number): string {
	const date = new Date(`${value}T12:00:00Z`);
	date.setUTCDate(1);
	date.setUTCMonth(date.getUTCMonth() + amount);
	return date.toISOString().slice(0, 10);
}
