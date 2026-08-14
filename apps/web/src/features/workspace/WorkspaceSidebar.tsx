import type { Category, Task } from "@em-todo/shared";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { RefObject } from "react";

import { CategoryColorMenu } from "../categories/CategoryColorMenu.js";
import { formatShortDate } from "../../date-format.js";
import { Icon } from "../../icons.js";
import { QuickCreate, type QuickCreateValues } from "./QuickCreate.js";
import type { DropProjection } from "./TaskBoard.js";
import type { SyncState } from "./TaskCard.js";
import { tasksForTarget, type NumberedTarget, type PlacementTarget } from "./workspace-model.js";

type WorkspaceSidebarProps = {
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
			<button aria-label="關閉側欄" className={`sidebar-scrim${props.open ? " is-open" : ""}`} onClick={props.onClose} tabIndex={props.open ? 0 : -1} type="button" />
			<aside aria-label="Backlog" className={`workspace-sidebar${props.open ? " is-open" : ""}`}>
				<header className="sidebar-header">
					<div className="sidebar-title-row">
						<strong>EM&apos;s To Do</strong>
						<button aria-label="關閉側欄" className="sidebar-close" onClick={props.onClose} type="button">
							<Icon name="close" />
						</button>
					</div>
					<label className="sidebar-search">
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

				<div className="sidebar-backlog">
					<div className="backlog-heading">
						<span>Backlog</span>
						<span className="count-badge">{props.tasks.length}</span>
					</div>
					<div className="category-groups">
						{props.categories.map(category => (
							<CategoryGroup {...props} category={category} key={category.id} />
						))}
					</div>
					<button className="add-category" onClick={props.onAddCategory} type="button">
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
			<section className={`category-group${isOver ? " category-group--over" : ""}`} ref={setNodeRef}>
				<header>
					<span className="category-dot" style={{ backgroundColor: props.category.color }} />
					<h2>{props.category.name}</h2>
					<span className="count-badge">{categoryTasks.length}</span>
					<button aria-label={`新增到 ${props.category.name}`} onClick={() => props.onStartCreate(target)} type="button">
						<Icon name="add" />
					</button>
					{props.targeting && shortcut ? <kbd className="target-key">{shortcut}</kbd> : null}
				</header>
				{props.activeTarget?.id === target.id ? <QuickCreate label={target.label} onCancel={props.onCancelCreate} onCreate={values => props.onCreate(target, values)} /> : null}
				{categoryTasks.map(task => (
					<BacklogTask containerId={target.id} key={task.id} onSelect={() => props.onSelectTask(task)} syncState={props.syncStates.get(task.id)} task={task} />
				))}
				{projected ? <div aria-hidden="true" className="backlog-drop-placeholder" /> : null}
			</section>
		</CategoryColorMenu>
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
			className={`backlog-task${isDragging ? " backlog-task--dragging" : ""}${syncState ? ` backlog-task--${syncState}` : ""}`}
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
