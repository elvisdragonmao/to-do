import { addDays, isoDateSchema, startOfSprint, type CreateTaskInput, type Task, type UpdateTaskInput } from "@em-todo/shared";
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
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type WheelEvent as ReactWheelEvent } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { CategoryDialog } from "../../categories/components/CategoryDialog.js";
import { useCategoryMutations } from "../../categories/hooks/useCategoryMutations.js";
import { categoriesQuery } from "../../categories/services/category-queries.js";
import { Button } from "../../../shared/components/button/Button.js";
import { Icon } from "../../../shared/components/icon/Icon.js";
import { Spinner } from "../../../shared/components/spinner/Spinner.js";
import { useTheme } from "../../../shared/hooks/useTheme.js";
import { formatSprintLabel } from "../../../shared/utils/date-format.js";
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
import { WorkspaceSidebar } from "../components/workspace-sidebar/WorkspaceSidebar.js";
import { useSprintPager } from "../hooks/useSprintPager.js";
import { useTaskMutations } from "../hooks/useTaskMutations.js";
import { findDirectionalTask, useWorkspaceKeyboard } from "../hooks/useWorkspaceKeyboard.js";
import { adjacentSprint, createInputForTarget, numberedTargets, sortOrderBefore, tasksForTarget, updateForTarget, type PlacementTarget, type ViewMode } from "../models/workspace-model.js";
import { allTasksQuery, backlogTasksQuery, sprintTasksQuery } from "../services/task-queries.js";
import type { SyncState } from "../types/task.js";
import styles from "./WorkspacePage.module.css";

const collisionDetection: CollisionDetection = args => {
	const pointerCollisions = pointerWithin(args);
	if (pointerCollisions.length === 0) return args.pointerCoordinates ? [] : closestCenter(args);
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
	const allTasksResult = useQuery({ ...allTasksQuery(), enabled: view === "list" });
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase("zh-TW"));
	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const [targeting, setTargeting] = useState(false);
	const [activeTarget, setActiveTarget] = useState<PlacementTarget | null>(null);
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const [projection, setProjection] = useState<DropProjection>(null);
	const [trashTargeted, setTrashTargeted] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [categoriesOpen, setCategoriesOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const searchRef = useRef<HTMLInputElement>(null);
	const pagerRef = useRef<HTMLElement>(null);
	const pendingFocusTaskRef = useRef<string | null>(null);
	const tasks = tasksQuery.data?.tasks ?? [];
	const backlogTasks = backlogQuery.data?.tasks ?? [];
	const allTasks = allTasksResult.data?.tasks ?? [];
	const categories = categoriesResult.data ?? [];
	const visibleSprintTasks = visibleSprintStart === sprintStart ? tasks : (pageTaskQueries[visibleSprintIndex]?.data?.tasks ?? []);
	const uncategorized = categories.find(category => category.isDefault)?.id ?? categories[0]?.id ?? "uncategorized";
	const numbered = useMemo(() => numberedTargets(view, sprintStart, categories), [categories, sprintStart, view]);
	const syncStates = useSyncStates();
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
	const selectTask = useCallback((taskId: string, focus = false) => {
		setSelectedTaskId(taskId);
		if (focus) {
			requestAnimationFrame(() => {
				const element = document.querySelector<HTMLElement>(`[data-task-card][data-task-id="${CSS.escape(taskId)}"]`);
				element?.focus({ preventScroll: true });
				element?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
			});
		}
	}, []);
	const selectBacklogTask = useCallback(
		(task: Task) => {
			if (task.isBacklog) {
				setSidebarOpen(false);
				setView("list");
				pendingFocusTaskRef.current = task.id;
				setSelectedTaskId(task.id);
				return;
			}
			setSidebarOpen(false);
			if (task.sprintStart === sprintStart) {
				selectTask(task.id, true);
				return;
			}
			pendingFocusTaskRef.current = task.id;
			setSelectedTaskId(task.id);
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
	const deleteTask = useCallback((taskId: string) => taskMutations.remove.mutate({ taskId }), [taskMutations.remove]);
	const moveSelection = useCallback(
		(direction: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight") => {
			const target = findDirectionalTask(selectedTaskId, direction);
			if (target?.dataset.taskId) selectTask(target.dataset.taskId, true);
		},
		[selectTask, selectedTaskId]
	);

	useWorkspaceKeyboard({
		onCreate: beginTargeting,
		onEscape: () => {
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
	useEffect(() => setPreviewSprintStart(sprintStart), [sprintStart]);
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
		const overTrash = event.over?.id === TASK_TRASH_ID;
		setTrashTargeted(overTrash);
		setProjection(overTrash ? null : projectionFromOver(event));
	}, []);
	const handleDragStart = useCallback((event: DragStartEvent) => {
		const pager = pagerRef.current;
		const currentPage = pager?.querySelector<HTMLElement>("[data-sprint-current]");
		if (pager && currentPage) pager.scrollTop = currentPage.offsetTop;
		setProjection(null);
		setTrashTargeted(false);
		setActiveTask(event.active.data.current?.task as Task);
	}, []);
	const handleDragEnd = (event: DragEndEvent) => {
		const task = event.active.data.current?.task as Task | undefined;
		const overTrash = event.over?.id === TASK_TRASH_ID;
		const next = projectionFromOver(event);
		setActiveTask(null);
		setProjection(null);
		setTrashTargeted(false);
		if (task && overTrash) {
			taskMutations.remove.mutate({ taskId: task.id });
			return;
		}
		if (!task || !next) return;
		const candidateTasks = next.target.kind === "category" ? backlogTasks : tasks;
		const destination = tasksForTarget(
			candidateTasks.filter(candidate => candidate.id !== task.id),
			next.target
		);
		const sortOrder = sortOrderBefore(destination, next.beforeTaskId);
		updateTask(task.id, updateForTarget(task, next.target, sortOrder, sprintStart));
	};

	if (sprintStart !== rawSprintStart) return <Navigate replace to={`/app/sprint/${sprintStart}`} />;

	return (
		<DndContext
			autoScroll={false}
			collisionDetection={collisionDetection}
			onDragCancel={() => {
				setActiveTask(null);
				setProjection(null);
				setTrashTargeted(false);
			}}
			onDragEnd={handleDragEnd}
			onDragOver={handleDragOver}
			onDragStart={handleDragStart}
			sensors={sensors}
		>
			<div className={styles.appShell}>
				<WorkspaceSidebar
					activeTaskId={activeTask?.id ?? null}
					activeTarget={activeTarget}
					categories={categories}
					numbered={numbered}
					onAddCategory={() => setCategoriesOpen(true)}
					onCancelCreate={cancelCreate}
					onChangeCategoryColor={(categoryId, color) => categoryMutations.updateColor.mutate({ categoryId, color })}
					onClose={() => setSidebarOpen(false)}
					onCreate={createTask}
					onSearch={setSearch}
					onSelectTask={selectBacklogTask}
					onStartCreate={startCreate}
					open={sidebarOpen}
					projection={projection}
					search={search}
					searchRef={searchRef}
					targeting={targeting}
					tasks={visibleBacklogTasks}
					syncStates={syncStates}
				/>

				<main aria-label="Sprint" className={styles.workspace} onWheel={forwardChromeWheel}>
					<header className={styles.topBar}>
						<button aria-label="開啟 Backlog" className={styles.mobileMenu} onClick={() => setSidebarOpen(true)} type="button">
							<Icon name="menu" />
						</button>
						<h1>{formatSprintLabel(visibleSprintStart)}</h1>
						<div className={styles.sync}>
							<SyncIndicator />
						</div>
						<ViewToggle onChange={setView} value={view} />
						<button aria-label="新增項目" className={styles.mobileCreate} onClick={beginTargeting} title="新增項目 (N)" type="button">
							<Icon name="add" />
						</button>
					</header>

					<div className={styles.body}>
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
									categories={categories}
									onDelete={deleteTask}
									onSelect={taskId => selectTask(taskId)}
									onUpdate={updateTask}
									searchMatches={searchMatches}
									selectedTaskId={selectedTaskId}
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
													activeTaskId={activeTask?.id ?? null}
													activeTarget={activeTarget}
													categories={categories}
													numbered={numbered}
													onCancelCreate={cancelCreate}
													onCreate={createTask}
													onSelect={taskId => selectTask(taskId)}
													onStartCreate={startCreate}
													onUpdate={updateTask}
													projection={projection}
													searchMatches={searchMatches}
													selectedTaskId={selectedTaskId}
													sprintStart={sprintStart}
													syncStates={syncStates}
													targeting={targeting}
													tasks={tasks}
													view={view}
												/>
											)}
										</section>
									) : (
										<SprintPreviewPage categories={categories} key={pageSprintStart} sprintStart={pageSprintStart} tasks={pageTaskQueries[index]?.data?.tasks ?? []} view={view} />
									)
								)}
							</section>
						)}
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
				{activeTask ? (
					<TaskCardPreview
						category={categories.find(category => category.id === activeTask.categoryId)}
						railTargeted={trashTargeted || Boolean(projection?.target.id.startsWith("calendar:"))}
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
