import type { Task, UpdateTaskInput } from "@em-todo/shared";
import { useEffect, useRef, useState } from "react";

import { formatShortDate } from "../../../../shared/utils/date-format.js";
import { Icon } from "../../../../shared/components/icon/Icon.js";
import styles from "./TaskCard.module.css";

export function TaskCardMetadata({
	disabled,
	onUpdate,
	showStatus,
	task
}: {
	disabled: boolean;
	onUpdate: <Key extends keyof UpdateTaskInput>(key: Key, value: UpdateTaskInput[Key]) => void;
	showStatus: boolean;
	task: Task;
}) {
	return (
		<div className={styles.meta}>
			<StaticMeta icon="calendar" label="建立" value={formatShortDate(task.createdAt.slice(0, 10))} />
			<EditableInput disabled={disabled} emptyValue="Sprint" icon="calendar" label="預計" onCommit={value => onUpdate("scheduledDate", value || null)} type="date" value={task.scheduledDate ?? ""} />
			{showStatus ? (
				<EditableSelect
					disabled={disabled}
					icon="board"
					label="狀態"
					onCommit={value => onUpdate("status", value as Task["status"])}
					options={[
						["TODO", "To Do"],
						["DOING", "In Progress"],
						["DONE", "Done"]
					]}
					value={task.status}
				/>
			) : null}
			<EditableInput
				disabled={disabled}
				icon="hourglass"
				inputMode="decimal"
				label="時數"
				onCommit={value => onUpdate("estimatedHours", value === "" ? null : Number(value))}
				suffix="h"
				type="number"
				value={task.estimatedHours === null ? "" : String(task.estimatedHours)}
			/>
			<EditableInput disabled={disabled} icon="clock" label="期限" onCommit={value => onUpdate("dueDate", value || null)} type="date" value={task.dueDate ?? ""} />
		</div>
	);
}

function EditableInput({
	disabled,
	emptyValue,
	icon,
	inputMode,
	label,
	onCommit,
	suffix,
	type,
	value
}: {
	disabled: boolean;
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
			<label className={styles.metaEditor}>
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
	return <MetaButton disabled={disabled} icon={icon} label={label} onClick={() => setEditing(true)} value={display} />;
}

function EditableSelect({
	disabled,
	icon,
	label,
	onCommit,
	options,
	value
}: {
	disabled: boolean;
	icon: Parameters<typeof Icon>[0]["name"];
	label: string;
	onCommit: (value: string) => void;
	options: string[][];
	value: string;
}) {
	const current = options.find(option => option[0] === value)?.[1] ?? value;
	return (
		<label className={styles.metaSelect} onPointerDown={event => event.stopPropagation()} title={`編輯${label}`}>
			<Icon name={icon} />
			<span>{label}</span>
			<select aria-label={label} disabled={disabled} onChange={event => onCommit(event.target.value)} value={value}>
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
		<span className={styles.metaStatic}>
			<Icon name={icon} />
			<span>{label}</span>
			<b>{value}</b>
		</span>
	);
}

function MetaButton({ disabled, icon, label, onClick, value }: { disabled: boolean; icon: Parameters<typeof Icon>[0]["name"]; label: string; onClick: () => void; value: string }) {
	return (
		<button className={styles.metaButton} disabled={disabled} onClick={onClick} onPointerDown={event => event.stopPropagation()} title={`編輯${label}`} type="button">
			<Icon name={icon} />
			<span>{label}</span>
			<b>{value}</b>
		</button>
	);
}
