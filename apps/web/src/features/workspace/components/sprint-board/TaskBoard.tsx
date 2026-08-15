import type { Category, Task, UpdateTaskInput } from "@em-todo/shared";
import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

import { Icon } from "../../../../shared/components/icon/Icon.js";
import { formatDay } from "../../../../shared/utils/date-format.js";
import { QuickCreate, type QuickCreateValues } from "../quick-create/QuickCreate.js";
import { TaskCard } from "../task-card/TaskCard.js";
import { STATUS_TARGETS, tasksForTarget, weekTargets, type NumberedTarget, type PlacementTarget, type ViewMode } from "../../models/workspace-model.js";
import type { SyncState } from "../../types/task.js";

export type DropProjection = { target: PlacementTarget; beforeTaskId?: string } | null;

type TaskBoardProps = {
	activeTarget: PlacementTarget | null;
	categories: Category[];
	numbered: NumberedTarget[];
	onCancelCreate: () => void;
	onCreate: (target: PlacementTarget, values: QuickCreateValues) => void;
	onSelect: (taskId: string) => void;
	onStartCreate: (target: PlacementTarget) => void;
	onUpdate: (taskId: string, input: UpdateTaskInput) => void;
	projection: DropProjection;
	searchMatches: Set<string> | null;
	selectedTaskId: string | null;
	sprintStart: string;
	syncStates: Map<string, SyncState>;
	targeting: boolean;
	tasks: Task[];
	view: Exclude<ViewMode, "list">;
};

export function TaskBoard(props: TaskBoardProps) {
	const targets = props.view === "kanban" ? STATUS_TARGETS : weekTargets(props.sprintStart);
	return (
		<div aria-label={props.view === "kanban" ? "Kanban" : "星期"} className={`task-board task-board--${props.view}`}>
			{targets.map(target => (
				<BoardColumn {...props} key={target.id} target={target} />
			))}
		</div>
	);
}

function BoardColumn({
	activeTarget,
	categories,
	numbered,
	onCancelCreate,
	onCreate,
	onSelect,
	onStartCreate,
	onUpdate,
	projection,
	searchMatches,
	selectedTaskId,
	syncStates,
	target,
	targeting,
	tasks,
	view
}: TaskBoardProps & { target: PlacementTarget }) {
	const { isOver, setNodeRef } = useDroppable({ id: `container:${target.id}`, data: { type: "container", target } });
	const targetTasks = tasksForTarget(tasks, target);
	const shortcut = numbered.find(item => item.id === target.id)?.key;
	const title = target.label;
	const supporting = view === "week" && target.kind === "day" && target.scheduledDate ? formatDay(target.scheduledDate).date : undefined;
	const projectedHere = projection?.target.id === target.id;

	return (
		<section className={`board-column${isOver ? " board-column--over" : ""}`} data-target-id={target.id} ref={setNodeRef}>
			<header className="board-column__header">
				<div>
					<h2>{title}</h2>
					{supporting ? <span>{supporting}</span> : null}
				</div>
				<span className="count-badge">{targetTasks.length}</span>
				<button aria-label={`新增到 ${title}`} className="column-add" onClick={() => onStartCreate(target)} title={`新增到 ${title}`} type="button">
					<Icon name="add" />
				</button>
				{targeting && shortcut !== undefined ? <kbd className="target-key">{shortcut}</kbd> : null}
			</header>

			<div className="board-column__tasks">
				{activeTarget?.id === target.id ? <QuickCreate label={target.label} onCancel={onCancelCreate} onCreate={values => onCreate(target, values)} /> : null}
				{targetTasks.map(task => (
					<TaskDropSlot beforeTaskId={task.id} key={task.id} projected={Boolean(projectedHere && projection?.beforeTaskId === task.id)} target={target}>
						<TaskCard
							categories={categories}
							category={categories.find(category => category.id === task.categoryId)}
							containerId={target.id}
							onSelect={onSelect}
							onUpdate={onUpdate}
							searchMatch={searchMatches?.has(task.id)}
							selected={selectedTaskId === task.id}
							showStatus={view === "week"}
							syncState={syncStates.get(task.id)}
							task={task}
						/>
					</TaskDropSlot>
				))}
				{projectedHere && !projection?.beforeTaskId ? <DropPlaceholder /> : null}
				{targetTasks.length === 0 && !activeTarget && !projectedHere ? (
					<button className="empty-column" onClick={() => onStartCreate(target)} type="button">
						<Icon name="add" />
						新增
					</button>
				) : null}
			</div>
		</section>
	);
}

function TaskDropSlot({ beforeTaskId, children, projected, target }: { beforeTaskId: string; children: ReactNode; projected: boolean; target: PlacementTarget }) {
	const { setNodeRef } = useDroppable({ id: `slot:${target.id}:${beforeTaskId}`, data: { type: "slot", target, beforeTaskId } });
	return (
		<div className="task-drop-slot" ref={setNodeRef}>
			{projected ? <DropPlaceholder /> : null}
			{children}
		</div>
	);
}

function DropPlaceholder() {
	return <div aria-hidden="true" className="drop-placeholder" />;
}
