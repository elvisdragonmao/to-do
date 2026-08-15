import type { Category, Task, UpdateTaskInput } from "@em-todo/shared";
import { useDraggable } from "@dnd-kit/core";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { CountBadge } from "@/shared/components/count-badge/CountBadge.js";
import { Icon } from "@/shared/components/icon/Icon.js";
import { formatShortDate } from "@/shared/utils/date-format.js";
import { linkify } from "@/shared/utils/linkify.js";
import { CategoryTag } from "../task-card/CategoryTag.js";
import {
	sortTasks,
	taskListStatus,
	updateForListPlannedDate,
	updateForListStatus,
	type TaskListStatus,
	type TaskSortDirection,
	type TaskSortKey
} from "@/features/workspace/models/task-list-model.js";
import type { SyncState } from "@/features/workspace/types/task.js";
import styles from "./TaskListView.module.css";

const STATUS_LABELS: Record<Task["status"], string> = {
	TODO: "To Do",
	DOING: "In Progress",
	DONE: "Done"
};

const COLUMNS: { key: TaskSortKey; label: string }[] = [
	{ key: "status", label: "狀態" },
	{ key: "urgency", label: "緊急" },
	{ key: "created", label: "建立" },
	{ key: "planned", label: "預計" },
	{ key: "hours", label: "時數" },
	{ key: "due", label: "Deadline" },
	{ key: "completed", label: "完成" }
];

export function TaskListView({
	activeTaskIds,
	categories,
	onDelete,
	onSelect,
	onUpdate,
	searchMatches,
	selectedTaskIds,
	syncStates,
	tasks
}: {
	activeTaskIds: Set<string>;
	categories: Category[];
	onDelete: (taskId: string) => void;
	onSelect: (taskId: string, additive: boolean) => void;
	onUpdate: (taskId: string, input: UpdateTaskInput) => void;
	searchMatches: Set<string> | null;
	selectedTaskIds: Set<string>;
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
		<section aria-label="所有項目" className={styles.view}>
			<header className={styles.summary}>
				<strong>所有項目</strong>
				<CountBadge>{tasks.length}</CountBadge>
			</header>
			{groups.map(group => (
				<section className={styles.group} key={group.category.id}>
					<header>
						<span className={styles.categoryDot} style={{ backgroundColor: group.category.color }} />
						<h2>{group.category.name}</h2>
						<CountBadge>{group.tasks.length}</CountBadge>
					</header>
					<div className={styles.scroll}>
						<table>
							<thead>
								<tr>
									<SortHeader direction={direction} label="項目" onSort={() => changeSort("title")} selected={sortKey === "title"} />
									<th scope="col">分類</th>
									{COLUMNS.map(column => (
										<SortHeader direction={direction} key={column.key} label={column.label} onSort={() => changeSort(column.key)} selected={sortKey === column.key} />
									))}
									<th className={styles.actionsHeader} scope="col">
										<span className="sr-only">操作</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{group.tasks.map(task => (
									<TaskRow
										active={activeTaskIds.has(task.id)}
										categories={categories}
										key={task.id}
										onDelete={() => onDelete(task.id)}
										onSelect={additive => onSelect(task.id, additive)}
										onUpdate={input => onUpdate(task.id, input)}
										searchMatch={searchMatches?.has(task.id)}
										selected={selectedTaskIds.has(task.id)}
										syncState={syncStates.get(task.id)}
										task={task}
									/>
								))}
							</tbody>
						</table>
					</div>
				</section>
			))}
			{groups.length === 0 ? <div className={styles.empty}>沒有項目</div> : null}
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

function TaskRow({
	active,
	categories,
	onDelete,
	onSelect,
	onUpdate,
	searchMatch,
	selected,
	syncState,
	task
}: {
	active: boolean;
	categories: Category[];
	onDelete: () => void;
	onSelect: (additive: boolean) => void;
	onUpdate: (input: UpdateTaskInput) => void;
	searchMatch: boolean | undefined;
	selected: boolean;
	syncState: SyncState;
	task: Task;
}) {
	const disabled = Boolean(syncState);
	const update = (input: Omit<UpdateTaskInput, "version">) => onUpdate({ version: task.version, ...input });
	const category = categories.find(item => item.id === task.categoryId);
	const drag = useDraggable({
		id: task.id,
		data: { type: "task", task, containerId: `list:${task.sprintStart}` },
		disabled
	});

	return (
		<tr
			aria-busy={Boolean(syncState)}
			aria-selected={selected}
			className={[
				selected ? styles.selected : "",
				active ? styles.dragSource : "",
				searchMatch === true ? styles.searchMatch : searchMatch === false ? styles.searchDim : "",
				syncState ? styles.syncing : ""
			]
				.filter(Boolean)
				.join(" ")}
			data-task-card
			data-task-id={task.id}
			onClick={event => onSelect(event.shiftKey)}
			ref={drag.setNodeRef}
			tabIndex={0}
		>
			<td>
				<div className={styles.titleCell}>
					<TaskTextEditor disabled={disabled} onCommit={update} task={task} />
					{syncState ? <small role="status">{syncState === "queued" ? "待同步" : syncState === "deleting" ? "刪除中" : "同步中"}</small> : null}
				</div>
			</td>
			<td className={styles.categoryCell}>
				<CategoryTag categories={categories} category={category} disabled={disabled} onChange={categoryId => update({ categoryId })} value={task.categoryId} />
			</td>
			<td>
				<label className={[styles.status, styles.selectControl, statusClass(task)].filter(Boolean).join(" ")}>
					<select aria-label={`${task.title} 狀態`} disabled={disabled} onChange={event => onUpdate(updateForListStatus(task, event.target.value as TaskListStatus))} value={taskListStatus(task)}>
						<option value="BACKLOG">Backlog</option>
						<option value="TODO">To Do</option>
						<option value="DOING">In Progress</option>
						<option value="DONE">Done</option>
					</select>
					<span>{task.isBacklog ? "Backlog" : STATUS_LABELS[task.status]}</span>
					<span aria-hidden="true" className={styles.selectArrow} />
				</label>
			</td>
			<td>
				<label className={[styles.urgency, styles.selectControl, styles[`urgency${task.urgency}`]].filter(Boolean).join(" ")}>
					<Icon name="flag" />
					<select aria-label={`${task.title} 緊急程度`} disabled={disabled} onChange={event => update({ urgency: Number(event.target.value) })} value={task.urgency}>
						{[1, 2, 3, 4].map(value => (
							<option key={value} value={value}>
								{value}
							</option>
						))}
					</select>
					<span>{task.urgency}</span>
					<span aria-hidden="true" className={styles.selectArrow} />
				</label>
			</td>
			<td>{formatShortDate(task.createdAt.slice(0, 10))}</td>
			<td>
				<EditableDate
					disabled={disabled}
					displayValue={plannedLabel(task)}
					label={`${task.title} 預計日期`}
					onCommit={value => onUpdate(updateForListPlannedDate(task, value))}
					value={task.scheduledDate ?? ""}
				/>
			</td>
			<td>
				<EditableHours disabled={disabled} label={`${task.title} 預估時數`} onCommit={estimatedHours => update({ estimatedHours })} value={task.estimatedHours} />
			</td>
			<td>
				<EditableDate
					disabled={disabled}
					displayValue={task.dueDate ? formatShortDate(task.dueDate) : "—"}
					label={`${task.title} Deadline`}
					onCommit={value => update({ dueDate: value || null })}
					value={task.dueDate ?? ""}
				/>
			</td>
			<td>{task.completedDate ? formatShortDate(task.completedDate) : "—"}</td>
			<td className={styles.actions}>
				<button
					{...drag.attributes}
					{...drag.listeners}
					aria-label={`拖曳 ${task.title}`}
					className={styles.dragButton}
					disabled={disabled}
					onClick={event => event.stopPropagation()}
					title="拖曳項目"
					type="button"
				>
					<Icon name="drag" />
				</button>
				<button
					aria-label={`刪除 ${task.title}`}
					className={styles.deleteButton}
					disabled={disabled}
					onClick={event => {
						event.stopPropagation();
						onDelete();
					}}
					title="刪除項目"
					type="button"
				>
					<Icon name="trash" />
				</button>
			</td>
		</tr>
	);
}

function TaskTextEditor({ disabled, onCommit, task }: { disabled: boolean; onCommit: (input: Omit<UpdateTaskInput, "version">) => void; task: Task }) {
	return (
		<div className={styles.title}>
			<InlineTextEditor
				className={styles.titleValue}
				disabled={disabled}
				editorClassName={styles.titleEditor}
				label="標題"
				maxLength={160}
				onCommit={title => onCommit({ title })}
				required
				value={task.title}
			/>
			<InlineTextEditor
				className={styles.descriptionValue}
				disabled={disabled}
				editorClassName={styles.descriptionEditor}
				label="描述"
				maxLength={4000}
				multiline
				onCommit={description => onCommit({ description })}
				placeholder="新增描述"
				value={task.description}
			/>
		</div>
	);
}

function InlineTextEditor({
	className,
	disabled,
	editorClassName,
	label,
	maxLength,
	multiline = false,
	onCommit,
	placeholder,
	required = false,
	value
}: {
	className: string | undefined;
	disabled: boolean;
	editorClassName: string | undefined;
	label: string;
	maxLength: number;
	multiline?: boolean;
	onCommit: (value: string) => void;
	placeholder?: string;
	required?: boolean;
	value: string;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const ignoreBlur = useRef(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	useEffect(() => {
		if (!editing) setDraft(value);
	}, [editing, value]);
	useEffect(() => {
		if (!editing) return;
		if (multiline) textareaRef.current?.focus();
		else inputRef.current?.focus();
	}, [editing, multiline]);
	useLayoutEffect(() => {
		if (!editing || !multiline || !textareaRef.current) return;
		const textarea = textareaRef.current;
		textarea.style.height = "0px";
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, [draft, editing, multiline]);

	const begin = () => {
		ignoreBlur.current = false;
		setDraft(value);
		setEditing(true);
	};
	const cancel = () => {
		ignoreBlur.current = true;
		setDraft(value);
		setEditing(false);
	};
	const commit = () => {
		const next = draft.trim();
		if (required && !next) {
			setDraft(value);
			setEditing(false);
			return;
		}
		setEditing(false);
		if (next !== value) onCommit(next);
	};
	const blur = () => {
		if (ignoreBlur.current) {
			ignoreBlur.current = false;
			return;
		}
		commit();
	};
	const keyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			cancel();
			return;
		}
		if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			commit();
		}
	};

	if (!editing) {
		return (
			<button className={[styles.inlineValue, className, value ? "" : styles.emptyValue].filter(Boolean).join(" ")} disabled={disabled} onClick={begin} title={`編輯${label}`} type="button">
				{value ? (multiline ? linkify(value) : value) : placeholder}
			</button>
		);
	}

	if (multiline) {
		return (
			<textarea
				aria-label={label}
				className={[styles.inlineEditor, editorClassName].filter(Boolean).join(" ")}
				maxLength={maxLength}
				onBlur={blur}
				onChange={event => setDraft(event.target.value)}
				onClick={event => event.stopPropagation()}
				onKeyDown={keyDown}
				ref={textareaRef}
				rows={1}
				value={draft}
			/>
		);
	}

	return (
		<input
			aria-label={label}
			className={[styles.inlineEditor, editorClassName].filter(Boolean).join(" ")}
			maxLength={maxLength}
			onBlur={blur}
			onChange={event => setDraft(event.target.value)}
			onClick={event => event.stopPropagation()}
			onKeyDown={keyDown}
			ref={inputRef}
			value={draft}
		/>
	);
}

function EditableDate({ disabled, displayValue, label, onCommit, value }: { disabled: boolean; displayValue: string; label: string; onCommit: (value: string) => void; value: string }) {
	const [editing, setEditing] = useState(false);
	if (editing) {
		return (
			<input
				aria-label={label}
				autoFocus
				className={`${styles.inlineEditor} ${styles.cellEditor}`}
				disabled={disabled}
				onBlur={() => setEditing(false)}
				onChange={event => {
					setEditing(false);
					if (event.target.value !== value) onCommit(event.target.value);
				}}
				onClick={event => event.stopPropagation()}
				onKeyDown={event => {
					if (event.key === "Escape") setEditing(false);
				}}
				type="date"
				value={value}
			/>
		);
	}
	return (
		<button
			aria-label={`${label}：${displayValue}`}
			className={styles.cellButton}
			disabled={disabled}
			onClick={event => {
				event.stopPropagation();
				setEditing(true);
			}}
			title={`編輯${label}`}
			type="button"
		>
			{displayValue}
		</button>
	);
}

function EditableHours({ disabled, label, onCommit, value }: { disabled: boolean; label: string; onCommit: (value: number | null) => void; value: number | null }) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value === null ? "" : String(value));
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => {
		if (!editing) setDraft(value === null ? "" : String(value));
	}, [editing, value]);
	useEffect(() => {
		if (editing) ref.current?.focus();
	}, [editing]);
	const commit = () => {
		const normalized = draft.trim();
		if (!normalized) {
			if (value !== null) onCommit(null);
			setEditing(false);
			return;
		}
		const next = Number(normalized);
		if (!Number.isFinite(next) || next < 0 || next > 10000) {
			setDraft(value === null ? "" : String(value));
			setEditing(false);
			return;
		}
		if (next !== value) onCommit(next);
		setEditing(false);
	};
	if (!editing) {
		return (
			<button
				aria-label={`${label}：${value === null ? "未設定" : `${value} 小時`}`}
				className={styles.cellButton}
				disabled={disabled}
				onClick={event => {
					event.stopPropagation();
					setDraft(value === null ? "" : String(value));
					setEditing(true);
				}}
				title={`編輯${label}`}
				type="button"
			>
				{value === null ? "—" : `${value}h`}
			</button>
		);
	}
	return (
		<label className={styles.hoursEditor}>
			<input
				aria-label={label}
				className={`${styles.inlineEditor} ${styles.numberEditor}`}
				disabled={disabled}
				inputMode="decimal"
				max="10000"
				min="0"
				onBlur={commit}
				onChange={event => setDraft(event.target.value)}
				onClick={event => event.stopPropagation()}
				onKeyDown={event => {
					if (event.key === "Enter") event.currentTarget.blur();
					if (event.key === "Escape") {
						event.preventDefault();
						setDraft(value === null ? "" : String(value));
						setEditing(false);
					}
				}}
				placeholder="—"
				ref={ref}
				step="0.25"
				type="number"
				value={draft}
			/>
			<span aria-hidden="true">h</span>
		</label>
	);
}

function plannedLabel(task: Task): string {
	if (task.isBacklog) return "—";
	if (task.scheduledDate) return formatShortDate(task.scheduledDate);
	return `${formatShortDate(task.sprintStart)} Sprint`;
}

function statusClass(task: Task): string | undefined {
	if (task.isBacklog) return styles.statusBacklog;
	if (task.status === "DONE") return styles.statusDone;
	if (task.status === "DOING") return styles.statusDoing;
	return undefined;
}
