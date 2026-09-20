import type { Category, Task, UpdateTaskInput } from "@em-todo/shared";
import { useDraggable } from "@dnd-kit/core";
import { memo } from "react";

import { Spinner } from "@/shared/components/spinner/Spinner.js";
import type { SyncState } from "@/features/workspace/types/task.js";
import { TaskCardActions } from "./TaskCardActions.js";
import styles from "./TaskCard.module.css";
import { TaskCardMetadata } from "./TaskCardMetadata.js";
import { TaskCardTextEditor } from "./TaskCardTextEditor.js";

type TaskCardProps = {
	categories: Category[];
	category: Category | undefined;
	compact: boolean;
	containerId: string;
	onSelect: (taskId: string, additive: boolean) => void;
	onUpdate: (taskId: string, input: UpdateTaskInput) => void;
	searchMatch: boolean | undefined;
	selected: boolean;
	showStatus: boolean;
	syncState: SyncState;
	task: Task;
};

export const TaskCard = memo(function TaskCard({ categories, category, compact, containerId, onSelect, onUpdate, searchMatch, selected, showStatus, syncState, task }: TaskCardProps) {
	const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
		id: task.id,
		data: { type: "task", task, containerId },
		disabled: Boolean(syncState)
	});
	const update = <Key extends keyof UpdateTaskInput>(key: Key, value: UpdateTaskInput[Key]) => onUpdate(task.id, { version: task.version, [key]: value });
	const className = [
		styles.card,
		compact ? styles.compact : "",
		selected ? styles.selected : "",
		task.status === "DONE" ? styles.done : "",
		syncState ? styles[syncState] : "",
		isDragging ? styles.dragging : "",
		searchMatch === true ? styles.searchMatch : searchMatch === false ? styles.searchDim : ""
	]
		.filter(Boolean)
		.join(" ");

	return (
		<article
			{...attributes}
			{...listeners}
			aria-busy={Boolean(syncState)}
			aria-selected={selected}
			className={className}
			data-container-id={containerId}
			data-task-card
			data-task-id={task.id}
			onClick={event => onSelect(task.id, event.shiftKey)}
			ref={setNodeRef}
			tabIndex={0}
		>
			<TaskCardTextEditor
				actions={
					<TaskCardActions
						categories={categories}
						category={category}
						disabled={Boolean(syncState)}
						onCategoryChange={value => update("categoryId", value)}
						onUrgencyChange={() => update("urgency", task.urgency === 4 ? 1 : task.urgency + 1)}
						urgency={task.urgency}
					/>
				}
				compact={compact}
				description={task.description}
				disabled={Boolean(syncState)}
				onCommit={input => onUpdate(task.id, { version: task.version, ...input })}
				title={task.title}
			/>
			{compact ? null : <TaskCardMetadata disabled={Boolean(syncState)} onUpdate={update} showStatus={showStatus} task={task} />}

			{syncState ? (
				<div className={styles.sync} role="status">
					<Spinner label={syncState === "queued" ? "等待網路" : "同步中"} size="small" />
					{syncState === "queued" ? "待同步" : syncState === "deleting" ? "刪除中" : "同步中"}
				</div>
			) : null}
		</article>
	);
});
