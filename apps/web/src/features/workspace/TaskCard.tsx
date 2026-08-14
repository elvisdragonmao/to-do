import type { Category, Task, UpdateTaskInput } from "@em-todo/shared";
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
	onUpdate: (taskId: string, input: UpdateTaskInput) => void;
	searchMatch: boolean | undefined;
	selected: boolean;
	showStatus: boolean;
	syncState: SyncState;
	task: Task;
};

export const TaskCard = memo(function TaskCard({ categories, category, containerId, onSelect, onUpdate, searchMatch, selected, showStatus, syncState, task }: TaskCardProps) {
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
			<TaskTextEditor
				actions={<UrgencyButton disabled={Boolean(syncState)} onChange={() => update("urgency", task.urgency === 4 ? 1 : task.urgency + 1)} urgency={task.urgency} />}
				description={task.description}
				disabled={Boolean(syncState)}
				onCommit={input => onUpdate(task.id, { version: task.version, ...input })}
				title={task.title}
			/>

			<div className="task-card__meta">
				<StaticMeta icon="calendar" label="建立" value={formatShortDate(task.createdAt.slice(0, 10))} />
				<EditableInput emptyValue="Sprint" icon="calendar" label="預計" onCommit={value => update("scheduledDate", value || null)} type="date" value={task.scheduledDate ?? ""} />
				{showStatus ? (
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
				) : null}
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
				<EditableInput icon="clock" label="期限" onCommit={value => update("dueDate", value || null)} type="date" value={task.dueDate ?? ""} />
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

function UrgencyButton({ disabled, onChange, urgency }: { disabled: boolean; onChange: () => void; urgency: number }) {
	const nextUrgency = urgency === 4 ? 1 : urgency + 1;
	return (
		<button
			aria-label={`緊急程度 ${urgency}，點擊調整為 ${nextUrgency}`}
			className="task-card__urgency urgency-flag"
			disabled={disabled}
			onClick={event => {
				event.stopPropagation();
				onChange();
			}}
			onPointerDown={event => event.stopPropagation()}
			title={`緊急程度 ${urgency}，點擊調整為 ${nextUrgency}`}
			type="button"
		>
			<Icon name="flag" />
		</button>
	);
}

export function TaskCardPreview({ category, railTargeted = false, task }: { category: Category | undefined; railTargeted?: boolean; task: Task }) {
	return (
		<article className={`task-card task-card--overlay${railTargeted ? " task-card--rail-overlay" : ""}`}>
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

function TaskTextEditor({
	actions,
	description,
	disabled,
	onCommit,
	title
}: {
	actions: ReactNode;
	description: string;
	disabled: boolean;
	onCommit: (input: { title?: string; description?: string }) => void;
	title: string;
}) {
	const [editing, setEditing] = useState<"title" | "description" | null>(null);
	const [draftTitle, setDraftTitle] = useState(title);
	const [draftDescription, setDraftDescription] = useState(description);
	const titleRef = useRef<HTMLInputElement>(null);
	const descriptionRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (editing !== null) return;
		setDraftTitle(title);
		setDraftDescription(description);
	}, [description, editing, title]);
	useEffect(() => {
		if (editing === "title") titleRef.current?.focus();
		if (editing === "description") descriptionRef.current?.focus();
	}, [editing]);

	const begin = (field: "title" | "description") => {
		if (disabled) return;
		if (editing === null) {
			setDraftTitle(title);
			setDraftDescription(description);
		}
		setEditing(field);
	};
	const cancel = () => {
		setDraftTitle(title);
		setDraftDescription(description);
		setEditing(null);
	};
	const commit = () => {
		const nextTitle = draftTitle.trim();
		const nextDescription = draftDescription.trim();
		if (!nextTitle) {
			setDraftTitle(title);
			setEditing("title");
			return;
		}
		const input: { title?: string; description?: string } = {};
		if (nextTitle !== title) input.title = nextTitle;
		if (nextDescription !== description) input.description = nextDescription;
		setEditing(null);
		if (Object.keys(input).length > 0) onCommit(input);
	};
	const blur = () => {
		requestAnimationFrame(() => {
			if (document.activeElement !== titleRef.current && document.activeElement !== descriptionRef.current) commit();
		});
	};
	const keyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			cancel();
			return;
		}
		if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			commit();
			return;
		}
		if (event.key === "Enter" && editing === "title") {
			event.preventDefault();
			setEditing("description");
		}
	};

	return (
		<>
			<header className="task-card__header">
				{editing === "title" ? (
					<input
						aria-label="標題"
						className="task-card__title inline-editor"
						maxLength={160}
						onBlur={blur}
						onChange={event => setDraftTitle(event.target.value)}
						onKeyDown={keyDown}
						ref={titleRef}
						value={draftTitle}
					/>
				) : (
					<button className="task-card__title inline-value" disabled={disabled} onClick={() => begin("title")} title="編輯標題" type="button">
						{editing === "description" ? draftTitle : title}
					</button>
				)}
				{actions}
			</header>

			{editing === "description" ? (
				<textarea
					aria-label="描述"
					className="task-card__description inline-editor"
					maxLength={4000}
					onBlur={blur}
					onChange={event => setDraftDescription(event.target.value)}
					onKeyDown={keyDown}
					ref={descriptionRef}
					rows={2}
					value={draftDescription}
				/>
			) : description ? (
				<button className="task-card__description inline-value" disabled={disabled} onClick={() => begin("description")} title="編輯描述" type="button">
					{linkify(description)}
				</button>
			) : null}
		</>
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
