import type { Category, Task } from "@sprintly/shared";
import { useDraggable } from "@dnd-kit/core";
import { memo, type KeyboardEvent, type ReactNode } from "react";

import { formatDay } from "../date-format.js";
import { Icon } from "../icons.js";
import { Spinner } from "./Spinner.js";

export type SyncState = "syncing" | "queued" | "deleting" | undefined;

export const TaskCard = memo(function TaskCard({
	category,
	onEdit,
	onToggle,
	syncState,
	task
}: {
	category: Category | undefined;
	onEdit: (task: Task) => void;
	onToggle: (task: Task) => void;
	syncState: SyncState;
	task: Task;
}) {
	const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform } = useDraggable({
		id: task.id,
		data: { task },
		disabled: Boolean(syncState)
	});
	const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
	const due = task.dueDate ? formatDay(task.dueDate) : null;
	const overdue = task.dueDate && task.status !== "DONE" && task.dueDate < new Date().toISOString().slice(0, 10);

	const handleKeyboard = (event: KeyboardEvent<HTMLElement>) => {
		if (event.target !== event.currentTarget) return;
		if (event.key === "Enter") {
			event.preventDefault();
			onEdit(task);
		} else if (event.key.toLowerCase() === "x" && !syncState) {
			event.preventDefault();
			onToggle(task);
		} else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			focusSiblingTask(event.currentTarget, event.key === "ArrowDown" ? 1 : -1);
		}
	};

	return (
		<article
			aria-busy={Boolean(syncState)}
			className={`task-card urgency-${task.urgency}${task.status === "DONE" ? " task-card--done" : ""}${syncState ? ` task-card--${syncState}` : ""}${isDragging ? " task-card--dragging" : ""}`}
			data-task-card
			onDoubleClick={() => onEdit(task)}
			onKeyDown={handleKeyboard}
			ref={setNodeRef}
			style={style}
			tabIndex={0}
		>
			<div aria-hidden="true" className="urgency-rail">
				{Array.from({ length: 4 }, (_, index) => (
					<span className={index < task.urgency ? "is-active" : ""} key={index} />
				))}
			</div>
			<button
				aria-checked={task.status === "DONE"}
				aria-label={task.status === "DONE" ? `將「${task.title}」標為未完成` : `完成「${task.title}」`}
				className="task-check"
				disabled={Boolean(syncState)}
				onClick={() => onToggle(task)}
				role="checkbox"
				type="button"
			>
				{task.status === "DONE" ? <Icon name="check" /> : null}
			</button>
			<div className="task-card__body">
				<div className="task-card__title-row">
					<h3>{task.title}</h3>
					{syncState ? (
						<span className="task-sync-label">
							<Spinner label={syncState === "queued" ? "等待網路" : "正在同步"} size="small" />
							{syncState === "queued" ? "待同步" : syncState === "deleting" ? "刪除中" : "同步中"}
						</span>
					) : null}
				</div>
				{task.description ? <p className="task-description">{linkify(task.description)}</p> : null}
				<div className="task-meta">
					<span className="category-chip">
						<i style={{ backgroundColor: category?.color ?? "var(--md-sys-color-outline)" }} />
						{category?.name ?? "未分類"}
					</span>
					{task.scheduledDate ? <span>{formatDay(task.scheduledDate).weekday}</span> : null}
					{task.estimatedHours !== null ? <span>{task.estimatedHours} 小時</span> : null}
					{due ? <span className={overdue ? "meta-overdue" : ""}>到期 {due.date}</span> : null}
				</div>
			</div>
			<button
				aria-label={`拖曳「${task.title}」`}
				className="drag-handle"
				disabled={Boolean(syncState)}
				ref={setActivatorNodeRef}
				title="拖曳移動；鍵盤可按 Space 拿起"
				type="button"
				{...listeners}
				{...attributes}
			>
				<Icon name="drag" />
			</button>
			<button aria-label={`編輯「${task.title}」`} className="task-edit" disabled={Boolean(syncState)} onClick={() => onEdit(task)} type="button">
				<Icon name="edit" />
			</button>
		</article>
	);
});

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

function focusSiblingTask(current: HTMLElement, offset: number) {
	const cards = [...document.querySelectorAll<HTMLElement>("[data-task-card]")].filter(element => element.offsetParent !== null);
	const index = cards.indexOf(current);
	cards[index + offset]?.focus();
}
