import type { Category, Task } from "@em-todo/shared";
import { useMemo, useState, type ReactNode } from "react";

import { formatShortDate } from "../../shared/utils/date-format.js";
import { Icon } from "../../icons.js";
import type { SyncState } from "./types/task.js";
import { sortTasks, type TaskSortDirection, type TaskSortKey } from "./task-list-model.js";

const STATUS_LABELS: Record<Task["status"], string> = {
	TODO: "To Do",
	DOING: "In Progress",
	DONE: "Done"
};

const COLUMNS: { key: TaskSortKey; label: string }[] = [
	{ key: "title", label: "項目" },
	{ key: "status", label: "狀態" },
	{ key: "urgency", label: "緊急" },
	{ key: "created", label: "建立" },
	{ key: "planned", label: "預計" },
	{ key: "hours", label: "時數" },
	{ key: "due", label: "Deadline" },
	{ key: "completed", label: "完成" }
];

export function TaskListView({
	categories,
	onSelect,
	searchMatches,
	selectedTaskId,
	syncStates,
	tasks
}: {
	categories: Category[];
	onSelect: (taskId: string) => void;
	searchMatches: Set<string> | null;
	selectedTaskId: string | null;
	syncStates: Map<string, SyncState>;
	tasks: Task[];
}) {
	const [sortKey, setSortKey] = useState<TaskSortKey>("planned");
	const [direction, setDirection] = useState<TaskSortDirection>("asc");
	const groups = useMemo(
		() =>
			categories
				.map(category => ({
					category,
					tasks: sortTasks(
						tasks.filter(task => task.categoryId === category.id),
						sortKey,
						direction
					)
				}))
				.filter(group => group.tasks.length > 0),
		[categories, direction, sortKey, tasks]
	);
	const changeSort = (key: TaskSortKey) => {
		if (key === sortKey) setDirection(current => (current === "asc" ? "desc" : "asc"));
		else {
			setSortKey(key);
			setDirection("asc");
		}
	};

	return (
		<section aria-label="所有項目" className="task-list-view">
			<header className="task-list-view__summary">
				<strong>所有項目</strong>
				<span className="count-badge">{tasks.length}</span>
			</header>
			{groups.map(group => (
				<section className="task-table-group" key={group.category.id}>
					<header>
						<span className="category-dot" style={{ backgroundColor: group.category.color }} />
						<h2>{group.category.name}</h2>
						<span className="count-badge">{group.tasks.length}</span>
					</header>
					<div className="task-table-scroll">
						<table>
							<thead>
								<tr>
									{COLUMNS.map(column => (
										<SortHeader direction={direction} key={column.key} label={column.label} onSort={() => changeSort(column.key)} selected={sortKey === column.key} />
									))}
								</tr>
							</thead>
							<tbody>
								{group.tasks.map(task => (
									<TaskRow
										key={task.id}
										onSelect={() => onSelect(task.id)}
										searchMatch={searchMatches?.has(task.id)}
										selected={selectedTaskId === task.id}
										syncState={syncStates.get(task.id)}
										task={task}
									/>
								))}
							</tbody>
						</table>
					</div>
				</section>
			))}
			{groups.length === 0 ? <div className="task-list-view__empty">沒有項目</div> : null}
		</section>
	);
}

function SortHeader({ direction, label, onSort, selected }: { direction: TaskSortDirection; label: string; onSort: () => void; selected: boolean }) {
	return (
		<th aria-sort={selected ? (direction === "asc" ? "ascending" : "descending") : undefined} scope="col">
			<button aria-label={`${label}排序${selected ? (direction === "asc" ? "，目前升冪" : "，目前降冪") : ""}`} onClick={onSort} type="button">
				{label}
				{selected ? <Icon name={direction === "asc" ? "chevronUp" : "chevronDown"} /> : null}
			</button>
		</th>
	);
}

function TaskRow({ onSelect, searchMatch, selected, syncState, task }: { onSelect: () => void; searchMatch: boolean | undefined; selected: boolean; syncState: SyncState; task: Task }) {
	return (
		<tr
			aria-busy={Boolean(syncState)}
			aria-selected={selected}
			className={`${selected ? "is-selected" : ""}${searchMatch === true ? " is-search-match" : searchMatch === false ? " is-search-dim" : ""}${syncState ? " is-syncing" : ""}`}
			data-task-card
			data-task-id={task.id}
			onClick={onSelect}
			onFocus={onSelect}
			tabIndex={0}
		>
			<td>
				<div className="task-table__title">
					<strong>{task.title}</strong>
					{task.description ? <span>{linkify(task.description)}</span> : null}
					{syncState ? <small role="status">{syncState === "queued" ? "待同步" : syncState === "deleting" ? "刪除中" : "同步中"}</small> : null}
				</div>
			</td>
			<td>
				<span className={`task-status-chip task-status-chip--${task.isBacklog ? "backlog" : task.status.toLowerCase()}`}>{task.isBacklog ? "Backlog" : STATUS_LABELS[task.status]}</span>
			</td>
			<td>
				<span aria-label={`緊急程度 ${task.urgency}`} className={`task-table__urgency urgency-${task.urgency}`}>
					<Icon name="flag" />
					{task.urgency}
				</span>
			</td>
			<td>{formatShortDate(task.createdAt.slice(0, 10))}</td>
			<td>{plannedLabel(task)}</td>
			<td>{task.estimatedHours === null ? "—" : `${task.estimatedHours}h`}</td>
			<td>{task.dueDate ? formatShortDate(task.dueDate) : "—"}</td>
			<td>{task.completedDate ? formatShortDate(task.completedDate) : "—"}</td>
		</tr>
	);
}

function plannedLabel(task: Task): string {
	if (task.isBacklog) return "—";
	if (task.scheduledDate) return formatShortDate(task.scheduledDate);
	return `${formatShortDate(task.sprintStart)} Sprint`;
}

function linkify(value: string): ReactNode[] {
	return value.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
		/^https?:\/\//.test(part) ? (
			<a href={part} key={`${part}-${index}`} onClick={event => event.stopPropagation()} rel="noreferrer" target="_blank">
				{part}
			</a>
		) : (
			part
		)
	);
}
