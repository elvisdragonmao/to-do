import type { Category, Task, UpdateTaskInput } from "@sprintly/shared";
import { useDraggable } from "@dnd-kit/core";
import { memo, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { formatShortDate } from "../../date-format.js";
import { Icon } from "../../icons.js";
import { Spinner } from "../../components/Spinner.js";

export type SyncState = "syncing" | "queued" | "deleting" | undefined;

type TaskCardProps = {
	categories: Category[];
	category: Category | undefined;
	containerId: string;
	onSelect: (taskId: string) => void;
	onDelete: (taskId: string) => void;
	onUpdate: (taskId: string, input: UpdateTaskInput) => void;
	searchMatch: boolean | undefined;
	selected: boolean;
	syncState: SyncState;
	task: Task;
};

export const TaskCard = memo(function TaskCard({ categories, category, containerId, onDelete, onSelect, onUpdate, searchMatch, selected, syncState, task }: TaskCardProps) {
	const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
		id: task.id,
		data: { type: "task", task, containerId },
		disabled: Boolean(syncState)
	});
	const update = <Key extends keyof UpdateTaskInput>(key: Key, value: UpdateTaskInput[Key]) => onUpdate(task.id, { version: task.version, [key]: value });

	return (
		<article
			{...attributes}
			{...listeners}
			aria-busy={Boolean(syncState)}
			aria-selected={selected}
			className={`task-card urgency-${task.urgency}${selected ? " task-card--selected" : ""}${task.status === "DONE" ? " task-card--done" : ""}${syncState ? ` task-card--${syncState}` : ""}${isDragging ? " task-card--dragging" : ""}${searchMatch === true ? " task-card--search-match" : searchMatch === false ? " task-card--search-dim" : ""}`}
			data-container-id={containerId}
			data-task-card
			data-task-id={task.id}
			onClick={() => onSelect(task.id)}
			onFocus={() => onSelect(task.id)}
			ref={setNodeRef}
			tabIndex={0}
		>
			<header className="task-card__header">
				<EditableText className="task-card__title" disabled={Boolean(syncState)} label="標題" maxLength={160} onCommit={value => update("title", value)} value={task.title} />
				<span aria-label={`緊急程度 ${task.urgency}`} className="urgency-flag">
					<Icon name="flag" />
				</span>
				<DeleteButton disabled={Boolean(syncState)} onDelete={() => onDelete(task.id)} />
			</header>

			<EditableText
				className="task-card__description"
				disabled={Boolean(syncState)}
				emptyLabel="描述"
				label="描述"
				maxLength={4000}
				multiline
				onCommit={value => update("description", value)}
				renderValue={linkify}
				value={task.description}
			/>

			<div className="task-card__meta">
				<StaticMeta icon="calendar" label="建立" value={formatShortDate(task.createdAt.slice(0, 10))} />
				<EditableSelect
					icon="board"
					label="狀態"
					onCommit={value => update("status", value as Task["status"])}
					options={[
						["TODO", "To Do"],
						["DOING", "In Progress"],
						["DONE", "Done"]
					]}
					value={task.status}
				/>
				<EditableSelect
					icon="flag"
					label="緊急"
					onCommit={value => update("urgency", Number(value))}
					options={[
						["1", "1"],
						["2", "2"],
						["3", "3"],
						["4", "4"]
					]}
					value={String(task.urgency)}
				/>
				<EditableSelect color={category?.color} label="分類" onCommit={value => update("categoryId", value)} options={categories.map(item => [item.id, item.name])} value={task.categoryId} />
				<EditableInput
					icon="hourglass"
					inputMode="decimal"
					label="時數"
					onCommit={value => update("estimatedHours", value === "" ? null : Number(value))}
					suffix="h"
					type="number"
					value={task.estimatedHours === null ? "" : String(task.estimatedHours)}
				/>
				<EditableInput emptyValue="Sprint" icon="calendar" label="預計" onCommit={value => update("scheduledDate", value || null)} type="date" value={task.scheduledDate ?? ""} />
				<EditableInput icon="calendar" label="初始" onCommit={value => update("initialPlannedDate", value)} type="date" value={task.initialPlannedDate} />
				<EditableInput icon="history" label="最後" onCommit={value => update("lastPlannedDate", value)} type="date" value={task.lastPlannedDate} />
				<EditableInput icon="clock" label="期限" onCommit={value => update("dueDate", value || null)} type="date" value={task.dueDate ?? ""} />
				<EditableInput icon="check" label="完成" onCommit={value => update("completedDate", value || null)} type="date" value={task.completedDate ?? ""} />
			</div>

			{syncState ? (
				<div className="task-card__sync" role="status">
					<Spinner label={syncState === "queued" ? "等待網路" : "同步中"} size="small" />
					{syncState === "queued" ? "待同步" : syncState === "deleting" ? "刪除中" : "同步中"}
				</div>
			) : null}
		</article>
	);
});

function DeleteButton({ disabled, onDelete }: { disabled: boolean; onDelete: () => void }) {
	const [armed, setArmed] = useState(false);

	useEffect(() => {
		if (!armed) return;
		const timeout = window.setTimeout(() => setArmed(false), 3000);
		return () => window.clearTimeout(timeout);
	}, [armed]);

	return (
		<button
			aria-label={armed ? "確認刪除項目" : "刪除項目"}
			className={`task-card__delete${armed ? " is-armed" : ""}`}
			disabled={disabled}
			onClick={event => {
				event.stopPropagation();
				if (armed) onDelete();
				else setArmed(true);
			}}
			onPointerDown={event => event.stopPropagation()}
			title={armed ? "再按一次確認刪除" : "刪除項目"}
			type="button"
		>
			<Icon name={armed ? "check" : "trash"} />
		</button>
	);
}

export function TaskCardPreview({ category, task }: { category: Category | undefined; task: Task }) {
	return (
		<article className="task-card task-card--overlay">
			<header className="task-card__header">
				<strong className="task-card__title-preview">{task.title}</strong>
				<span className={`urgency-flag urgency-${task.urgency}`}>
					<Icon name="flag" />
				</span>
			</header>
			{task.description ? <div className="task-card__description-preview">{linkify(task.description)}</div> : null}
			<div className="task-card__preview-meta">
				<span>
					<i style={{ backgroundColor: category?.color ?? "var(--md-sys-color-outline)" }} />
					{category?.name ?? "未分類"}
				</span>
				{task.estimatedHours === null ? null : <span>{task.estimatedHours}h</span>}
				{task.dueDate ? <span>{formatShortDate(task.dueDate)}</span> : null}
			</div>
		</article>
	);
}

function EditableText({
	className,
	disabled,
	emptyLabel,
	label,
	maxLength,
	multiline = false,
	onCommit,
	renderValue,
	value
}: {
	className: string;
	disabled: boolean;
	emptyLabel?: string;
	label: string;
	maxLength: number;
	multiline?: boolean;
	onCommit: (value: string) => void;
	renderValue?: (value: string) => ReactNode;
	value: string;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
	useEffect(() => setDraft(value), [value]);
	useEffect(() => {
		if (editing) ref.current?.focus();
	}, [editing]);
	const commit = () => {
		const next = draft.trim();
		setEditing(false);
		if ((label !== "標題" || next) && next !== value) onCommit(next);
		else setDraft(value);
	};
	const keyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			setDraft(value);
			setEditing(false);
		} else if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			commit();
		}
	};
	if (editing) {
		const props = {
			"aria-label": label,
			className: `${className} inline-editor`,
			maxLength,
			onBlur: commit,
			onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value),
			onKeyDown: keyDown,
			ref,
			value: draft
		};
		return multiline ? <textarea {...props} rows={2} /> : <input {...props} />;
	}
	return (
		<button className={`${className} inline-value`} disabled={disabled} onClick={() => setEditing(true)} title={`編輯${label}`} type="button">
			{value ? renderValue ? renderValue(value) : value : <span className="inline-value--empty">{emptyLabel ?? label}</span>}
		</button>
	);
}

function EditableInput({
	emptyValue,
	icon,
	inputMode,
	label,
	onCommit,
	suffix,
	type,
	value
}: {
	emptyValue?: string;
	icon: Parameters<typeof Icon>[0]["name"];
	inputMode?: "decimal";
	label: string;
	onCommit: (value: string) => void;
	suffix?: string;
	type: "date" | "number";
	value: string;
}) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(value);
	const ref = useRef<HTMLInputElement>(null);
	useEffect(() => setDraft(value), [value]);
	useEffect(() => {
		if (editing) ref.current?.focus();
	}, [editing]);
	const commit = () => {
		setEditing(false);
		if (draft !== value) onCommit(draft);
	};
	if (editing) {
		return (
			<label className="task-meta-editor">
				<span>{label}</span>
				<input
					aria-label={label}
					inputMode={inputMode}
					onBlur={commit}
					onChange={event => setDraft(event.target.value)}
					onKeyDown={event => {
						if (event.key === "Enter") commit();
						if (event.key === "Escape") {
							setDraft(value);
							setEditing(false);
						}
					}}
					ref={ref}
					step={type === "number" ? "0.25" : undefined}
					type={type}
					value={draft}
				/>
			</label>
		);
	}
	const display = value ? (type === "date" ? formatShortDate(value) : `${value}${suffix ?? ""}`) : (emptyValue ?? "—");
	return <MetaButton icon={icon} label={label} onClick={() => setEditing(true)} value={display} />;
}

function EditableSelect({
	color,
	icon,
	label,
	onCommit,
	options,
	value
}: {
	color?: string;
	icon?: Parameters<typeof Icon>[0]["name"];
	label: string;
	onCommit: (value: string) => void;
	options: string[][];
	value: string;
}) {
	const current = options.find(option => option[0] === value)?.[1] ?? value;
	return (
		<label className="task-meta-select" onPointerDown={event => event.stopPropagation()} title={`編輯${label}`}>
			{color ? <i style={{ backgroundColor: color }} /> : icon ? <Icon name={icon} /> : null}
			<span>{label}</span>
			<select aria-label={label} onChange={event => onCommit(event.target.value)} value={value}>
				{options.map(([optionValue, optionLabel]) => (
					<option key={optionValue} value={optionValue}>
						{optionLabel}
					</option>
				))}
			</select>
			<b>{current}</b>
		</label>
	);
}

function StaticMeta({ icon, label, value }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string }) {
	return (
		<span className="task-meta-static">
			<Icon name={icon} />
			<span>{label}</span>
			<b>{value}</b>
		</span>
	);
}

function MetaButton({ icon, label, onClick, value }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; onClick: () => void; value: string }) {
	return (
		<button className="task-meta-button" onClick={onClick} onPointerDown={event => event.stopPropagation()} title={`編輯${label}`} type="button">
			<Icon name={icon} />
			<span>{label}</span>
			<b>{value}</b>
		</button>
	);
}

function linkify(description: string): ReactNode[] {
	return description.split(/(https?:\/\/[^\s]+)/g).map((part, index) =>
		/^https?:\/\//.test(part) ? (
			<a key={index} href={part} onClick={event => event.stopPropagation()} rel="noreferrer" target="_blank">
				{part}
			</a>
		) : (
			part
		)
	);
}
