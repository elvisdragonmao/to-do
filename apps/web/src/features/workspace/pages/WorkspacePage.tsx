import { addDays, isoDateSchema, startOfSprint, type Category, type CreateTaskInput, type Task, type UpdateCategoryInput, type UpdateTaskInput } from "@em-todo/shared";
import {
	closestCenter,
	DndContext,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	pointerWithin,
	useSensor,
	useSensors,
	type CollisionDetection,
	type DragEndEvent,
	type DragOverEvent,
	type DragStartEvent
} from "@dnd-kit/core";
import { useMutationState, useQueries, useQuery } from "@tanstack/react-query";
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { CategoryDialog } from "@/features/categories/components/CategoryDialog.js";
import { useCategoryMutations } from "@/features/categories/hooks/useCategoryMutations.js";
import { categorySortOrderAfterMove } from "@/features/categories/models/category-order.js";
import { categoriesQuery } from "@/features/categories/services/category-queries.js";
import { Button } from "@/shared/components/button/Button.js";
import { Icon } from "@/shared/components/icon/Icon.js";
import { Spinner } from "@/shared/components/spinner/Spinner.js";
import { useTheme } from "@/shared/hooks/useTheme.js";
import { formatSprintLabel } from "@/shared/utils/date-format.js";
import { MiniCalendar } from "../components/mini-calendar/MiniCalendar.js";
import type { QuickCreateValues } from "../components/quick-create/QuickCreate.js";
import { ShortcutDialog } from "../components/shortcut-dialog/ShortcutDialog.js";
import { SprintPreviewPage } from "../components/sprint-board/SprintPreviewPage.js";
import sprintPageStyles from "../components/sprint-board/SprintPage.module.css";
import { TaskBoard, type DropProjection } from "../components/sprint-board/TaskBoard.js";
import { SyncIndicator } from "../components/sync-indicator/SyncIndicator.js";
import { TaskCardPreview } from "../components/task-card/TaskCardPreview.js";
import { TaskListView } from "../components/task-list/TaskListView.js";
import { TASK_TRASH_ID, TaskTrash } from "../components/task-trash/TaskTrash.js";
import { UtilityDock } from "../components/utility-dock/UtilityDock.js";
import { ViewToggle } from "../components/view-toggle/ViewToggle.js";
import { CategoryDragPreview, WorkspaceSidebar } from "../components/workspace-sidebar/WorkspaceSidebar.js";
import { useSprintPager } from "../hooks/useSprintPager.js";
import { useTaskMutations } from "../hooks/useTaskMutations.js";
import { findDirectionalTask, useWorkspaceKeyboard } from "../hooks/useWorkspaceKeyboard.js";
import { adjacentSprint, createInputForTarget, numberedTargets, sortOrdersBefore, tasksForTarget, updateForTarget, type PlacementTarget, type ViewMode } from "../models/workspace-model.js";
import { allTasksQuery, backlogTasksQuery, sprintTasksQuery } from "../services/task-queries.js";
import type { SyncState } from "../types/task.js";
import styles from "./WorkspacePage.module.css";

const collisionDetection: CollisionDetection = args => {
	if (args.active.data.current?.type === "category-sort") {
		return closestCenter({
			...args,
			droppableContainers: args.droppableContainers.filter(container => container.data.current?.type === "category-sort-target")
		});
	}
	const taskContainers = args.droppableContainers.filter(container => container.data.current?.type !== "category-sort-target");
	const pointerCollisions = pointerWithin({ ...args, droppableContainers: taskContainers });
	if (pointerCollisions.length === 0) {
		if (!args.pointerCoordinates) return closestCenter({ ...args, droppableContainers: taskContainers });
		const calendarContainers = taskContainers.filter(container => container.data.current?.type === "calendar-day");
		const calendarRects = calendarContainers.map(container => args.droppableRects.get(container.id)).filter(rect => rect !== undefined);
		if (calendarRects.length > 0) {
			const bounds = {
				left: Math.min(...calendarRects.map(rect => rect.left)),
				right: Math.max(...calendarRects.map(rect => rect.right)),
				top: Math.min(...calendarRects.map(rect => rect.top)),
				bottom: Math.max(...calendarRects.map(rect => rect.bottom))
			};
			const { x, y } = args.pointerCoordinates;
			if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
				return calendarContainers
					.flatMap(container => {
						const rect = args.droppableRects.get(container.id);
						if (!rect) return [];
						const distance = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
						return [{ id: container.id, data: { droppableContainer: container, value: distance } }];
					})
					.toSorted((left, right) => left.data.value - right.data.value);
			}
		}
		return [];
	}
	const typeFor = (id: string | number) => args.droppableContainers.find(container => container.id === id)?.data.current?.type;
	return pointerCollisions.toSorted((left, right) => collisionPriority(typeFor(left.id)) - collisionPriority(typeFor(right.id)));
};

function collisionPriority(type: unknown): number {
	return type === "slot" || type === "calendar-day" || type === "task-trash" ? 0 : 1;
}

const PAGER_RADIUS = 12;
const PAGER_QUERY_RADIUS = 2;

export function WorkspacePage() {
	const { sprintStart: rawSprintStart = "" } = useParams();
	const sprintStart = isoDateSchema.safeParse(rawSprintStart).success ? startOfSprint(rawSprintStart) : startOfSprint(new Date());
	const previousSprintStart = adjacentSprint(sprintStart, -1);
	const nextSprintStart = adjacentSprint(sprintStart, 1);
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const pagerSprints = useMemo(() => Array.from({ length: PAGER_RADIUS * 2 + 1 }, (_, index) => addDays(sprintStart, (index - PAGER_RADIUS) * 7)), [sprintStart]);
	const [previewSprintStart, setPreviewSprintStart] = useState(sprintStart);
	const visibleSprintStart = pagerSprints.includes(previewSprintStart) ? previewSprintStart : sprintStart;
	const visibleSprintIndex = pagerSprints.indexOf(visibleSprintStart);
	const tasksQuery = useQuery(sprintTasksQuery(sprintStart));
	const pageTaskQueries = useQueries({
		queries: pagerSprints.map((pageSprintStart, index) => ({
			...sprintTasksQuery(pageSprintStart),
			enabled: pageSprintStart !== sprintStart && Math.abs(index - visibleSprintIndex) <= PAGER_QUERY_RADIUS
		}))
	});
	const backlogQuery = useQuery(backlogTasksQuery());
	const categoriesResult = useQuery(categoriesQuery());
	const taskMutations = useTaskMutations();
	const categoryMutations = useCategoryMutations();
	const [theme, toggleTheme] = useTheme();
	const [view, setViewState] = useState<ViewMode>(() => {
		const stored = localStorage.getItem("em-todo-view");
		return stored === "week" || stored === "list" ? stored : "kanban";
	});
	const [compact, setCompactState] = useState(() => localStorage.getItem("em-todo-compact") === "on");
	const allTasksResult = useQuery({ ...allTasksQuery(), enabled: view === "list" });
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase("zh-TW"));
	const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => new Set());
	const [selectionAnchorTaskId, setSelectionAnchorTaskId] = useState<string | null>(null);
	const [targeting, setTargeting] = useState(false);
	const [activeTarget, setActiveTarget] = useState<PlacementTarget | null>(null);
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const [activeDraggedTasks, setActiveDraggedTasks] = useState<Task[]>([]);
	const [activeCategory, setActiveCategory] = useState<Category | null>(null);
	const [categoryDropTargetId, setCategoryDropTargetId] = useState<string | null>(null);
	const [projection, setProjection] = useState<DropProjection>(null);
	const [trashTargeted, setTrashTargeted] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [categoriesOpen, setCategoriesOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const searchRef = useRef<HTMLInputElement>(null);
	const pagerRef = useRef<HTMLElement>(null);
	const pendingFocusTaskRef = useRef<string | null>(null);
	const activeDraggedTasksRef = useRef<Task[]>([]);
	const ignoreTaskClickRef = useRef(false);
	const tasks = tasksQuery.data?.tasks ?? [];
	const backlogTasks = backlogQuery.data?.tasks ?? [];
	const allTasks = allTasksResult.data?.tasks ?? [];
	const categories = categoriesResult.data ?? [];
	const visibleSprintTasks = visibleSprintStart === sprintStart ? tasks : (pageTaskQueries[visibleSprintIndex]?.data?.tasks ?? []);
	const uncategorized = categories.find(category => category.isDefault)?.id ?? categories[0]?.id ?? "uncategorized";
	const numbered = useMemo(() => numberedTargets(view, sprintStart, categories), [categories, sprintStart, view]);
	const syncStates = useSyncStates();
	const activeTaskIds = useMemo(() => new Set(activeDraggedTasks.map(task => task.id)), [activeDraggedTasks]);
	const searchableTasks = view === "list" ? allTasks : tasks;
	const searchMatches = useMemo(() => {
		if (!deferredSearch) return null;
		return new Set(
			searchableTasks
				.filter(task => {
					const category = categories.find(item => item.id === task.categoryId)?.name ?? "";
					return `${task.title} ${task.description} ${category}`.toLocaleLowerCase("zh-TW").includes(deferredSearch);
				})
				.map(task => task.id)
		);
	}, [categories, deferredSearch, searchableTasks]);
	const visibleBacklogTasks = useMemo(() => {
		if (!deferredSearch) return backlogTasks;
		return backlogTasks.filter(task => {
			const category = categories.find(item => item.id === task.categoryId)?.name ?? "";
			return `${task.title} ${task.description} ${category}`.toLocaleLowerCase("zh-TW").includes(deferredSearch);
		});
	}, [backlogTasks, categories, deferredSearch]);

	const setCompact = useCallback((next: boolean) => {
		setCompactState(next);
		localStorage.setItem("em-todo-compact", next ? "on" : "off");
	}, []);
	const setView = useCallback((next: ViewMode) => {
		startTransition(() => setViewState(next));
		localStorage.setItem("em-todo-view", next);
		setActiveTarget(null);
		setTargeting(false);
	}, []);
	const goToSprint = useCallback((next: string) => navigate(`/app/sprint/${next}`), [navigate]);
	const goToday = useCallback(() => {
		const todaySprint = startOfSprint(new Date());
		setPreviewSprintStart(todaySprint);
		goToSprint(todaySprint);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const currentPage = pagerRef.current?.querySelector<HTMLElement>("[data-sprint-current]");
				if (currentPage && pagerRef.current) pagerRef.current.scrollTo({ behavior: "auto", top: currentPage.offsetTop });
			});
		});
	}, [goToSprint]);
	const dragging = activeTask !== null;
	const goRelative = useSprintPager(pagerRef, sprintStart, goToSprint, setPreviewSprintStart, dragging, view !== "list");
	const forwardChromeWheel = useCallback(
		(event: ReactWheelEvent<HTMLElement>) => {
			const pager = pagerRef.current;
			if (dragging || !pager || pager.contains(event.target as Node) || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
			const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 32 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? pager.clientHeight : 1;
			pager.scrollBy({ behavior: "auto", top: event.deltaY * scale });
		},
		[dragging]
	);
	const selectSprint = useCallback(
		(next: string) => {
			if (view === "list") goToSprint(next);
			else if (next === previousSprintStart) goRelative(-1);
			else if (next === nextSprintStart) goRelative(1);
			else goToSprint(next);
		},
		[goRelative, goToSprint, nextSprintStart, previousSprintStart, view]
	);
	const clearTaskSelection = useCallback(() => {
		setSelectedTaskIds(new Set());
		setSelectionAnchorTaskId(null);
	}, []);
	const selectTask = useCallback((taskId: string, focus = false, additive = false) => {
		if (ignoreTaskClickRef.current) return;
		setSelectedTaskIds(current => {
			if (!additive) return new Set([taskId]);
			const next = new Set(current);
			if (next.has(taskId)) next.delete(taskId);
			else next.add(taskId);
			return next;
		});
		setSelectionAnchorTaskId(taskId);
		if (focus) {
			requestAnimationFrame(() => {
				const element = document.querySelector<HTMLElement>(`[data-task-card][data-task-id="${CSS.escape(taskId)}"]`);
				element?.focus({ preventScroll: true });
				element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
			});
		}
	}, []);
	const selectBacklogTask = useCallback(
		(task: Task, additive: boolean) => {
			if (additive) {
				selectTask(task.id, false, true);
				return;
			}
			selectTask(task.id);
			if (task.isBacklog) {
				setSidebarOpen(false);
				setView("list");
				pendingFocusTaskRef.current = task.id;
				return;
			}
			setSidebarOpen(false);
			if (task.sprintStart === sprintStart) {
				selectTask(task.id, true);
				return;
			}
			pendingFocusTaskRef.current = task.id;
			goToSprint(task.sprintStart);
		},
		[goToSprint, selectTask, setView, sprintStart]
	);
	const focusSearch = useCallback(() => {
		setSidebarOpen(true);
		requestAnimationFrame(() => searchRef.current?.focus());
	}, []);
	const beginTargeting = useCallback(() => {
		setActiveTarget(null);
		setSidebarOpen(view !== "week");
		setTargeting(true);
	}, [view]);
	const chooseNumberedTarget = useCallback(
		(key: string) => {
			const target = numbered.find(item => item.key === key);
			if (!target) return false;
			setActiveTarget(target);
			setTargeting(false);
			if (target.kind !== "category") setSidebarOpen(false);
			return true;
		},
		[numbered]
	);
	const startCreate = useCallback((target: PlacementTarget) => {
		setActiveTarget(target);
		setTargeting(false);
	}, []);
	const cancelCreate = useCallback(() => {
		setActiveTarget(null);
		setTargeting(false);
	}, []);
	const createTask = useCallback(
		(target: PlacementTarget, values: QuickCreateValues) => {
			const input: CreateTaskInput = createInputForTarget({ ...values, categoryId: uncategorized, sprintStart, target });
			taskMutations.create.mutate({ input, optimisticId: `optimistic-${crypto.randomUUID()}` });
			setActiveTarget(null);
			setTargeting(false);
		},
		[sprintStart, taskMutations.create, uncategorized]
	);
	const updateTask = useCallback((taskId: string, input: UpdateTaskInput) => taskMutations.update.mutate({ taskId, input }), [taskMutations.update]);
	const deleteTask = useCallback(
		(taskId: string) => {
			taskMutations.remove.mutate({ taskId });
			setSelectedTaskIds(current => {
				if (!current.has(taskId)) return current;
				const next = new Set(current);
				next.delete(taskId);
				return next;
			});
		},
		[taskMutations.remove]
	);
	const moveSelection = useCallback(
		(direction: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight") => {
			const target = findDirectionalTask(selectionAnchorTaskId, direction);
			if (target?.dataset.taskId) selectTask(target.dataset.taskId, true);
		},
		[selectTask, selectionAnchorTaskId]
	);

	useWorkspaceKeyboard({
		onCreate: beginTargeting,
		onEscape: () => {
			clearTaskSelection();
			setActiveTarget(null);
			setTargeting(false);
			setSidebarOpen(false);
			setCategoriesOpen(false);
			setShortcutsOpen(false);
		},
		onFocusSearch: focusSearch,
		onMoveSelection: moveSelection,
		onNextSprint: () => (view === "list" ? goToSprint(nextSprintStart) : goRelative(1)),
		onOpenShortcuts: () => setShortcutsOpen(true),
		onPreviousSprint: () => (view === "list" ? goToSprint(previousSprintStart) : goRelative(-1)),
		onSelectTarget: chooseNumberedTarget,
		onSetView: setView,
		onToday: goToday,
		targeting
	});
	useEffect(() => {
		if (!deferredSearch) return;
		const match = searchableTasks.find(task => searchMatches?.has(task.id));
		if (match) selectTask(match.id, true);
	}, [deferredSearch, searchMatches, searchableTasks, selectTask]);
	useEffect(() => {
		const taskId = pendingFocusTaskRef.current;
		const focusableTasks = view === "list" ? allTasks : tasks;
		if (!taskId || !focusableTasks.some(task => task.id === taskId)) return;
		pendingFocusTaskRef.current = null;
		selectTask(taskId, true);
	}, [allTasks, selectTask, tasks, view]);
	useEffect(() => {
		setPreviewSprintStart(sprintStart);
		clearTaskSelection();
	}, [clearTaskSelection, sprintStart]);
	useEffect(() => {
		const mobile = window.matchMedia("(max-width: 839px)");
		const closeOnMobile = (event: MediaQueryListEvent) => {
			if (event.matches) setSidebarOpen(false);
		};
		mobile.addEventListener("change", closeOnMobile);
		return () => mobile.removeEventListener("change", closeOnMobile);
	}, []);
	useEffect(() => {
		if (searchParams.get("action") === "new") {
			beginTargeting();
			setSearchParams({}, { replace: true });
		}
	}, [beginTargeting, searchParams, setSearchParams]);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor));
	const handleDragOver = useCallback((event: DragOverEvent) => {
		if (event.active.data.current?.type === "category-sort") {
			setCategoryDropTargetId((event.over?.data.current?.categoryId as string | undefined) ?? null);
			return;
		}
		const overTrash = event.over?.id === TASK_TRASH_ID;
		setTrashTargeted(overTrash);
		setProjection(overTrash ? null : projectionFromOver(event));
	}, []);
	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			if (event.active.data.current?.type === "category-sort") {
				const category = event.active.data.current.category as Category;
				activeDraggedTasksRef.current = [];
				setActiveDraggedTasks([]);
				setActiveCategory(category);
				setCategoryDropTargetId(category.id);
				setActiveTask(null);
				setProjection(null);
				setTrashTargeted(false);
				return;
			}
			const task = event.active.data.current?.task as Task | undefined;
			if (!task) return;
			const dragSelection = selectedTaskIds.has(task.id) ? selectedTaskIds : new Set([task.id]);
			if (!selectedTaskIds.has(task.id)) {
				setSelectedTaskIds(new Set([task.id]));
				setSelectionAnchorTaskId(task.id);
			}
			const taskById = new Map([...allTasks, ...tasks, ...backlogTasks, task].map(item => [item.id, item]));
			const domOrder = [...document.querySelectorAll<HTMLElement>("[data-task-id]")].map(element => element.dataset.taskId).filter(id => id !== undefined);
			const orderedIds = [...new Set([...domOrder, ...dragSelection])];
			const draggedTasks = orderedIds.map(id => taskById.get(id)).filter((item): item is Task => item !== undefined && dragSelection.has(item.id) && !syncStates.has(item.id));
			activeDraggedTasksRef.current = draggedTasks.length > 0 ? draggedTasks : [task];
			setActiveDraggedTasks(activeDraggedTasksRef.current);
			const pager = pagerRef.current;
			const currentPage = pager?.querySelector<HTMLElement>("[data-sprint-current]");
			if (pager && currentPage) pager.scrollTop = currentPage.offsetTop;
			setProjection(null);
			setTrashTargeted(false);
			setActiveTask(task);
		},
		[allTasks, backlogTasks, selectedTaskIds, syncStates, tasks]
	);
	const handleDragEnd = (event: DragEndEvent) => {
		if (event.active.data.current?.type === "category-sort") {
			const category = event.active.data.current.category as Category | undefined;
			const overCategoryId = event.over?.data.current?.categoryId as string | undefined;
			setActiveCategory(null);
			setCategoryDropTargetId(null);
			if (!category || !overCategoryId) return;
			const sortOrder = categorySortOrderAfterMove(categories, category.id, overCategoryId);
			if (sortOrder !== null) categoryMutations.update.mutate({ categoryId: category.id, input: { sortOrder } });
			return;
		}
		const task = event.active.data.current?.task as Task | undefined;
		const draggedTasks = activeDraggedTasksRef.current.length > 0 ? activeDraggedTasksRef.current : task ? [task] : [];
		const overTrash = event.over?.id === TASK_TRASH_ID;
		const next = projectionFromOver(event);
		ignoreTaskClickRef.current = true;
		window.setTimeout(() => {
			ignoreTaskClickRef.current = false;
		}, 0);
		activeDraggedTasksRef.current = [];
		setActiveDraggedTasks([]);
		setActiveTask(null);
		setProjection(null);
		setTrashTargeted(false);
		if (draggedTasks.length > 0 && overTrash) {
			for (const draggedTask of draggedTasks) taskMutations.remove.mutate({ taskId: draggedTask.id });
			clearTaskSelection();
			return;
		}
		if (draggedTasks.length === 0 || !next) return;
		const draggedIds = new Set(draggedTasks.map(draggedTask => draggedTask.id));
		const candidateTasks = next.target.kind === "category" ? backlogTasks : tasks;
		const destination = tasksForTarget(
			candidateTasks.filter(candidate => !draggedIds.has(candidate.id)),
			next.target
		);
		const beforeTaskId = next.beforeTaskId && !draggedIds.has(next.beforeTaskId) ? next.beforeTaskId : undefined;
		const sortOrders = sortOrdersBefore(destination, beforeTaskId, draggedTasks.length);
		for (const [index, draggedTask] of draggedTasks.entries()) {
			updateTask(draggedTask.id, updateForTarget(draggedTask, next.target, sortOrders[index]!, sprintStart));
		}
		clearTaskSelection();
	};

	if (sprintStart !== rawSprintStart) return <Navigate replace to={`/app/sprint/${sprintStart}`} />;

	return (
		<DndContext
			autoScroll={false}
			collisionDetection={collisionDetection}
			onDragCancel={() => {
				activeDraggedTasksRef.current = [];
				setActiveDraggedTasks([]);
				setActiveCategory(null);
				setCategoryDropTargetId(null);
				setActiveTask(null);
				setProjection(null);
				setTrashTargeted(false);
				ignoreTaskClickRef.current = true;
				window.setTimeout(() => {
					ignoreTaskClickRef.current = false;
				}, 0);
			}}
			onDragEnd={handleDragEnd}
			onDragOver={handleDragOver}
			onDragStart={handleDragStart}
			sensors={sensors}
		>
			<div
				className={styles.appShell}
				onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
					const target = event.target as Element;
					if (!target.closest("[data-task-card], [data-backlog-task]")) clearTaskSelection();
				}}
			>
				<WorkspaceSidebar
					activeCategoryId={activeCategory?.id ?? null}
					activeTaskIds={activeTaskIds}
					activeTarget={activeTarget}
					categories={categories}
					categoryDropTargetId={categoryDropTargetId}
					numbered={numbered}
					onAddCategory={() => setCategoriesOpen(true)}
					onCancelCreate={cancelCreate}
					onClose={() => setSidebarOpen(false)}
					onCreate={createTask}
					onSearch={setSearch}
					onSelectTask={selectBacklogTask}
					onStartCreate={startCreate}
					onUpdateCategory={(categoryId: string, input: UpdateCategoryInput) => categoryMutations.update.mutate({ categoryId, input })}
					open={sidebarOpen}
					projection={projection}
					search={search}
					searchRef={searchRef}
					selectedTaskIds={selectedTaskIds}
					targeting={targeting}
					tasks={visibleBacklogTasks}
					syncStates={syncStates}
				/>

				<main aria-label="Sprint" className={styles.workspace} onWheel={forwardChromeWheel}>
					<header className={styles.topBar}>
						<button aria-label="開啟 Backlog" className={styles.mobileMenu} onClick={() => setSidebarOpen(true)} type="button">
							<Icon name="menu" />
						</button>
						<h1>
							<span className={styles.sprintTitle} key={visibleSprintStart}>
								{formatSprintLabel(visibleSprintStart)}
							</span>
						</h1>
						<div className={styles.sync}>
							<SyncIndicator />
						</div>
						<ViewToggle compact={compact} onChange={setView} onCompactChange={setCompact} value={view} />
						<button aria-label="新增項目" className={styles.mobileCreate} onClick={beginTargeting} title="新增項目 (N)" type="button">
							<Icon name="add" />
						</button>
					</header>

					<div className={styles.body}>
						<div className={styles.viewContent} key={view}>
							{view === "list" ? (
								allTasksResult.isPending && !allTasksResult.data ? (
									<div aria-busy="true" className={styles.contentState}>
										<Spinner label="載入所有項目" />
									</div>
								) : allTasksResult.isError && !allTasksResult.data ? (
									<div className={styles.contentState} role="alert">
										<p>{allTasksResult.error.message}</p>
										<Button onClick={() => allTasksResult.refetch()} type="button" variant="tonal">
											重試
										</Button>
									</div>
								) : (
									<TaskListView
										activeTaskIds={activeTaskIds}
										categories={categories}
										onDelete={deleteTask}
										onSelect={(taskId, additive) => selectTask(taskId, false, additive)}
										onUpdate={updateTask}
										searchMatches={searchMatches}
										selectedTaskIds={selectedTaskIds}
										syncStates={syncStates}
										tasks={allTasks}
									/>
								)
							) : (
								<section aria-label="Sprint 項目" className={[styles.pager, dragging ? styles.dragging : ""].filter(Boolean).join(" ")} ref={pagerRef}>
									{pagerSprints.map((pageSprintStart, index) =>
										pageSprintStart === sprintStart ? (
											<section
												aria-label={`${formatSprintLabel(sprintStart)} 項目`}
												className={sprintPageStyles.page}
												data-sprint-current
												data-sprint-page
												data-sprint-start={sprintStart}
												key={pageSprintStart}
											>
												{tasksQuery.isPending && !tasksQuery.data ? (
													<div aria-busy="true" className={styles.contentState}>
														<Spinner label="載入中" />
													</div>
												) : tasksQuery.isError && !tasksQuery.data ? (
													<div className={styles.contentState} role="alert">
														<p>{tasksQuery.error.message}</p>
														<Button onClick={() => tasksQuery.refetch()} type="button" variant="tonal">
															重試
														</Button>
													</div>
												) : (
													<TaskBoard
														activeTaskIds={activeTaskIds}
														activeTarget={activeTarget}
														categories={categories}
														compact={compact}
														numbered={numbered}
														onCancelCreate={cancelCreate}
														onCreate={createTask}
														onSelect={(taskId, additive) => selectTask(taskId, false, additive)}
														onStartCreate={startCreate}
														onUpdate={updateTask}
														projection={projection}
														searchMatches={searchMatches}
														selectedTaskIds={selectedTaskIds}
														sprintStart={sprintStart}
														syncStates={syncStates}
														targeting={targeting}
														tasks={tasks}
														view={view}
													/>
												)}
											</section>
										) : (
											<SprintPreviewPage categories={categories} compact={compact} key={pageSprintStart} sprintStart={pageSprintStart} tasks={pageTaskQueries[index]?.data?.tasks ?? []} view={view} />
										)
									)}
								</section>
							)}
						</div>
						<div className={[styles.rail, dragging ? styles.railDragging : ""].filter(Boolean).join(" ")}>
							<MiniCalendar dragActive={dragging} onSelectSprint={selectSprint} sprintStart={visibleSprintStart} tasks={visibleSprintTasks} />
							{dragging ? <TaskTrash active /> : null}
						</div>
					</div>
					<UtilityDock onHelp={() => setShortcutsOpen(true)} onTheme={toggleTheme} theme={theme} />
				</main>
			</div>

			<CategoryDialog categories={categories} onClose={() => setCategoriesOpen(false)} open={categoriesOpen} />
			<ShortcutDialog onClose={() => setShortcutsOpen(false)} open={shortcutsOpen} />
			<DragOverlay dropAnimation={null}>
				{activeCategory ? (
					<CategoryDragPreview category={activeCategory} />
				) : activeTask ? (
					<TaskCardPreview
						category={categories.find(category => category.id === activeTask.categoryId)}
						compact={compact && view !== "list"}
						railTargeted={trashTargeted || Boolean(projection?.target.id.startsWith("calendar:"))}
						selectionCount={activeDraggedTasks.length}
						task={activeTask}
					/>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}

function projectionFromOver(event: DragOverEvent | DragEndEvent): DropProjection {
	const data = event.over?.data.current as { target?: PlacementTarget; beforeTaskId?: string } | undefined;
	if (!data?.target || data.beforeTaskId === String(event.active.id)) return null;
	return { target: data.target, ...(data.beforeTaskId ? { beforeTaskId: data.beforeTaskId } : {}) };
}

function useSyncStates(): Map<string, SyncState> {
	const pending = useMutationState({
		filters: { status: "pending" },
		select: mutation => ({
			isPaused: mutation.state.isPaused,
			key: mutation.options.mutationKey,
			variables: mutation.state.variables as { taskId?: string; optimisticId?: string } | undefined
		})
	});
	return useMemo(() => {
		const states = new Map<string, SyncState>();
		for (const mutation of pending) {
			const id = mutation.variables?.taskId ?? mutation.variables?.optimisticId;
			if (!id) continue;
			const deleting = mutation.key?.[1] === "delete";
			states.set(id, mutation.isPaused ? "queued" : deleting ? "deleting" : "syncing");
		}
		return states;
	}, [pending]);
}
