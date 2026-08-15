import type { Category, Task } from "@em-todo/shared";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { ReactNode, RefObject } from "react";

import { CategoryColorMenu } from "../../../categories/components/CategoryColorMenu.js";
import { CountBadge } from "../../../../shared/components/count-badge/CountBadge.js";
import { Icon } from "../../../../shared/components/icon/Icon.js";
import { TargetKey } from "../../../../shared/components/target-key/TargetKey.js";
import { formatShortDate } from "../../../../shared/utils/date-format.js";
import { QuickCreate, type QuickCreateValues } from "../quick-create/QuickCreate.js";
import type { DropProjection } from "../sprint-board/TaskBoard.js";
import { tasksForTarget, type NumberedTarget, type PlacementTarget } from "../../models/workspace-model.js";
import type { SyncState } from "../../types/task.js";
import styles from "./WorkspaceSidebar.module.css";

type WorkspaceSidebarProps = {
	activeTaskId: string | null;
	activeTarget: PlacementTarget | null;
	categories: Category[];
	numbered: NumberedTarget[];
	onAddCategory: () => void;
	onCancelCreate: () => void;
	onChangeCategoryColor: (categoryId: string, color: string) => void;
	onClose: () => void;
	onCreate: (target: PlacementTarget, values: QuickCreateValues) => void;
	onSearch: (value: string) => void;
	onSelectTask: (task: Task) => void;
	onStartCreate: (target: PlacementTarget) => void;
	open: boolean;
	projection: DropProjection;
	search: string;
	searchRef: RefObject<HTMLInputElement | null>;
	syncStates: Map<string, SyncState>;
	targeting: boolean;
	tasks: Task[];
};

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
	return (
		<>
			<button aria-label="關閉側欄" className={[styles.scrim, props.open ? styles.open : ""].filter(Boolean).join(" ")} onClick={props.onClose} tabIndex={props.open ? 0 : -1} type="button" />
			<aside aria-label="Backlog" className={[styles.sidebar, props.open ? styles.open : ""].filter(Boolean).join(" ")}>
				<header className={styles.header}>
					<div className={styles.titleRow}>
						<strong>EM&apos;s To Do</strong>
						<button aria-label="關閉側欄" className={styles.close} onClick={props.onClose} type="button">
							<Icon name="close" />
						</button>
					</div>
					<label className={styles.search}>
						<Icon name="search" />
						<span className="sr-only">搜尋項目</span>
						<input onChange={event => props.onSearch(event.target.value)} placeholder="搜尋項目" ref={props.searchRef} value={props.search} />
						{props.search ? (
							<button aria-label="清除搜尋" onClick={() => props.onSearch("")} type="button">
								<Icon name="close" />
							</button>
						) : null}
					</label>
				</header>

				<div className={styles.backlog}>
					<div className={styles.heading}>
						<span>Backlog</span>
						<CountBadge>{props.tasks.length}</CountBadge>
					</div>
					<div className={styles.groups}>
						{props.categories.map(category => (
							<CategoryGroup {...props} category={category} key={category.id} />
						))}
					</div>
					<button className={styles.addCategory} onClick={props.onAddCategory} type="button">
						新增分類
					</button>
				</div>
			</aside>
		</>
	);
}

function CategoryGroup(props: WorkspaceSidebarProps & { category: Category }) {
	const target: PlacementTarget = { id: `category:${props.category.id}`, kind: "category", label: props.category.name, categoryId: props.category.id };
	const categoryTasks = tasksForTarget(props.tasks, target);
	const shortcut = props.numbered.find(item => item.id === target.id)?.key;
	const { isOver, setNodeRef } = useDroppable({ id: `container:${target.id}`, data: { type: "container", target } });
	const projected = props.projection?.target.id === target.id;

	return (
		<CategoryColorMenu category={props.category} onChange={color => props.onChangeCategoryColor(props.category.id, color)}>
			<section className={[styles.group, isOver ? styles.groupOver : ""].filter(Boolean).join(" ")} ref={setNodeRef}>
				<header>
					<span className={styles.categoryDot} style={{ backgroundColor: props.category.color }} />
					<h2>{props.category.name}</h2>
					<CountBadge>{categoryTasks.length}</CountBadge>
					<button aria-label={`新增到 ${props.category.name}`} onClick={() => props.onStartCreate(target)} type="button">
						<Icon name="add" />
					</button>
					{props.targeting && shortcut ? <TargetKey>{shortcut}</TargetKey> : null}
				</header>
				{props.activeTarget?.id === target.id ? <QuickCreate label={target.label} onCancel={props.onCancelCreate} onCreate={values => props.onCreate(target, values)} /> : null}
				{categoryTasks.map(task => (
					<BacklogDropSlot active={props.activeTaskId === task.id} beforeTaskId={task.id} key={task.id} projected={Boolean(projected && props.projection?.beforeTaskId === task.id)} target={target}>
						<BacklogTask containerId={target.id} onSelect={() => props.onSelectTask(task)} syncState={props.syncStates.get(task.id)} task={task} />
					</BacklogDropSlot>
				))}
				{projected && !props.projection?.beforeTaskId ? <div aria-hidden="true" className={styles.placeholder} /> : null}
			</section>
		</CategoryColorMenu>
	);
}

function BacklogDropSlot({ active, beforeTaskId, children, projected, target }: { active: boolean; beforeTaskId: string; children: ReactNode; projected: boolean; target: PlacementTarget }) {
	const { setNodeRef } = useDroppable({ id: `slot:${target.id}:${beforeTaskId}`, data: { type: "slot", target, beforeTaskId }, disabled: active });
	return (
		<div className={[styles.dropSlot, active ? styles.activeSource : ""].filter(Boolean).join(" ")} ref={setNodeRef}>
			{projected ? <div aria-hidden="true" className={styles.placeholder} /> : null}
			{children}
		</div>
	);
}

function BacklogTask({ containerId, onSelect, syncState, task }: { containerId: string; onSelect: () => void; syncState: SyncState; task: Task }) {
	const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
		id: task.id,
		data: { type: "task", task, containerId },
		disabled: Boolean(syncState)
	});

	return (
		<button
			{...attributes}
			{...listeners}
			aria-busy={Boolean(syncState)}
			className={[styles.task, isDragging ? styles.dragging : "", syncState ? styles.subdued : ""].filter(Boolean).join(" ")}
			data-backlog-task
			data-task-id={task.id}
			disabled={Boolean(syncState)}
			onClick={onSelect}
			ref={setNodeRef}
			type="button"
		>
			<strong>{task.title}</strong>
			<span>
				{syncState ? (syncState === "queued" ? "待同步" : syncState === "deleting" ? "刪除中" : "同步中") : task.estimatedHours === null ? null : `${task.estimatedHours}h`}
				{!syncState && task.estimatedHours !== null && task.dueDate ? " · " : null}
				{!syncState && task.dueDate ? formatShortDate(task.dueDate) : null}
			</span>
		</button>
	);
}
