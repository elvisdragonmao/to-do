import type { Category, Task, UpdateCategoryInput } from "@em-todo/shared";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useCallback, useState, type ReactNode, type RefObject } from "react";

import { CategoryEditorPopover } from "@/features/categories/components/CategoryEditorPopover.js";
import { CountBadge } from "@/shared/components/count-badge/CountBadge.js";
import { Icon } from "@/shared/components/icon/Icon.js";
import { TargetKey } from "@/shared/components/target-key/TargetKey.js";
import { formatShortDate } from "@/shared/utils/date-format.js";
import { QuickCreate, type QuickCreateValues } from "../quick-create/QuickCreate.js";
import type { DropProjection } from "../sprint-board/TaskBoard.js";
import { tasksForTarget, type NumberedTarget, type PlacementTarget } from "@/features/workspace/models/workspace-model.js";
import type { SyncState } from "@/features/workspace/types/task.js";
import styles from "./WorkspaceSidebar.module.css";

type WorkspaceSidebarProps = {
	activeCategoryId: string | null;
	activeTaskIds: Set<string>;
	activeTarget: PlacementTarget | null;
	categories: Category[];
	categoryDropTargetId: string | null;
	numbered: NumberedTarget[];
	onAddCategory: () => void;
	onCancelCreate: () => void;
	onClose: () => void;
	onCreate: (target: PlacementTarget, values: QuickCreateValues) => void;
	onSearch: (value: string) => void;
	onSelectTask: (task: Task, additive: boolean) => void;
	onStartCreate: (target: PlacementTarget) => void;
	onUpdateCategory: (categoryId: string, input: UpdateCategoryInput) => void;
	open: boolean;
	projection: DropProjection;
	search: string;
	searchRef: RefObject<HTMLInputElement | null>;
	selectedTaskIds: Set<string>;
	syncStates: Map<string, SyncState>;
	targeting: boolean;
	tasks: Task[];
};

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
	const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(readCollapsedCategoryIds);
	const toggleCategory = useCallback((categoryId: string) => {
		setCollapsedCategoryIds(current => {
			const next = new Set(current);
			if (next.has(categoryId)) next.delete(categoryId);
			else next.add(categoryId);
			rememberCollapsedCategoryIds(next);
			return next;
		});
	}, []);

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
							<CategoryGroup {...props} category={category} collapsed={collapsedCategoryIds.has(category.id)} key={category.id} onToggleCollapsed={toggleCategory} />
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

function CategoryGroup(props: WorkspaceSidebarProps & { category: Category; collapsed: boolean; onToggleCollapsed: (categoryId: string) => void }) {
	const target: PlacementTarget = { id: `category:${props.category.id}`, kind: "category", label: props.category.name, categoryId: props.category.id };
	const categoryTasks = tasksForTarget(props.tasks, target);
	const shortcut = props.numbered.find(item => item.id === target.id)?.key;
	const taskDrop = useDroppable({ id: `container:${target.id}`, data: { type: "container", target } });
	const categoryDrop = useDroppable({ id: `category-sort-target:${props.category.id}`, data: { type: "category-sort-target", categoryId: props.category.id } });
	const categoryDrag = useDraggable({ id: `category-sort:${props.category.id}`, data: { type: "category-sort", category: props.category } });
	const setCategoryHeaderRef = useCallback(
		(node: HTMLElement | null) => {
			categoryDrop.setNodeRef(node);
			categoryDrag.setNodeRef(node);
		},
		[categoryDrag.setNodeRef, categoryDrop.setNodeRef]
	);
	const projected = props.projection?.target.id === target.id;
	const categoryTargeted = props.categoryDropTargetId === props.category.id && props.activeCategoryId !== props.category.id;
	const contentId = `backlog-category-${props.category.id}`;

	return (
		<section
			className={[styles.group, taskDrop.isOver ? styles.groupOver : "", categoryTargeted ? styles.categoryDropTarget : "", categoryDrag.isDragging ? styles.categoryDragging : ""]
				.filter(Boolean)
				.join(" ")}
			data-category-id={props.category.id}
			ref={taskDrop.setNodeRef}
		>
			<header ref={setCategoryHeaderRef}>
				<button {...categoryDrag.attributes} {...categoryDrag.listeners} aria-label={`上下拖曳分類 ${props.category.name}`} className={styles.dragHandle} title="拖曳排序" type="button">
					<Icon name="drag" />
				</button>
				<button
					aria-controls={contentId}
					aria-expanded={!props.collapsed}
					aria-label={`${props.collapsed ? "展開" : "收合"} ${props.category.name}`}
					className={styles.collapse}
					onClick={() => props.onToggleCollapsed(props.category.id)}
					type="button"
				>
					<Icon name={props.collapsed ? "chevronRight" : "chevronDown"} />
				</button>
				<CategoryEditorPopover category={props.category} onUpdate={input => props.onUpdateCategory(props.category.id, input)}>
					<span className={styles.categoryDot} style={{ backgroundColor: props.category.color }} />
					<h2>{props.category.name}</h2>
					<CountBadge>{categoryTasks.length}</CountBadge>
				</CategoryEditorPopover>
				<button
					aria-label={`新增到 ${props.category.name}`}
					className={styles.addTask}
					onClick={() => {
						if (props.collapsed) props.onToggleCollapsed(props.category.id);
						props.onStartCreate(target);
					}}
					type="button"
				>
					<Icon name="add" />
				</button>
				{props.targeting && shortcut ? <TargetKey>{shortcut}</TargetKey> : null}
			</header>
			<div aria-hidden={props.collapsed} className={[styles.categoryContent, props.collapsed ? styles.categoryContentCollapsed : ""].filter(Boolean).join(" ")} id={contentId} inert={props.collapsed}>
				<div className={styles.categoryContentInner}>
					{props.activeTarget?.id === target.id ? <QuickCreate label={target.label} onCancel={props.onCancelCreate} onCreate={values => props.onCreate(target, values)} /> : null}
					{categoryTasks.map(task => (
						<BacklogDropSlot
							active={props.activeTaskIds.has(task.id)}
							beforeTaskId={task.id}
							key={task.id}
							projected={Boolean(projected && props.projection?.beforeTaskId === task.id)}
							target={target}
						>
							<BacklogTask
								containerId={target.id}
								onSelect={additive => props.onSelectTask(task, additive)}
								selected={props.selectedTaskIds.has(task.id)}
								syncState={props.syncStates.get(task.id)}
								task={task}
							/>
						</BacklogDropSlot>
					))}
					{projected && !props.projection?.beforeTaskId ? <div aria-hidden="true" className={styles.placeholder} /> : null}
				</div>
			</div>
		</section>
	);
}

export function CategoryDragPreview({ category }: { category: Category }) {
	return (
		<div className={styles.categoryPreview}>
			<Icon name="drag" />
			<span className={styles.categoryDot} style={{ backgroundColor: category.color }} />
			<strong>{category.name}</strong>
		</div>
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

function BacklogTask({ containerId, onSelect, selected, syncState, task }: { containerId: string; onSelect: (additive: boolean) => void; selected: boolean; syncState: SyncState; task: Task }) {
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
			aria-pressed={selected}
			className={[styles.task, selected ? styles.taskSelected : "", isDragging ? styles.dragging : "", syncState ? styles.subdued : ""].filter(Boolean).join(" ")}
			data-backlog-task
			data-task-id={task.id}
			disabled={Boolean(syncState)}
			onClick={event => onSelect(event.shiftKey)}
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

const COLLAPSED_CATEGORIES_KEY = "em-todo-collapsed-categories-v1";

function readCollapsedCategoryIds(): Set<string> {
	if (typeof window === "undefined") return new Set();
	try {
		const value = JSON.parse(localStorage.getItem(COLLAPSED_CATEGORIES_KEY) ?? "[]");
		return new Set(Array.isArray(value) ? value.filter(item => typeof item === "string") : []);
	} catch {
		return new Set();
	}
}

function rememberCollapsedCategoryIds(categoryIds: Set<string>) {
	localStorage.setItem(COLLAPSED_CATEGORIES_KEY, JSON.stringify([...categoryIds]));
}
