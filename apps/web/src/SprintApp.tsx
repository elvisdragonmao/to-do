import { addDays, type Category, type CreateTaskInput, type Task, type UpdateTaskInput, isoDateSchema, startOfSprint } from "@sprintly/shared";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { logout } from "./api.js";
import { CategoryDialog } from "./components/CategoryDialog.js";
import { ShortcutDialog } from "./components/ShortcutDialog.js";
import { Spinner } from "./components/Spinner.js";
import { SyncIndicator } from "./components/SyncIndicator.js";
import { type SyncState } from "./components/TaskCard.js";
import { KanbanView, ListView } from "./components/TaskViews.js";
import { TaskDialog } from "./components/TaskDialog.js";
import { formatSprintLabel, formatSprintRange } from "./date-format.js";
import { Icon } from "./icons.js";
import { persister, queryKeys, sprintTasksQuery, categoriesQuery } from "./queries.js";
import { useTaskMutations } from "./task-mutations.js";

type View = "list" | "kanban";

export default function SprintApp() {
	return (
		<Routes>
			<Route index element={<Navigate replace to={`sprint/${startOfSprint(new Date())}`} />} />
			<Route path="sprint/:sprintStart" element={<Workspace />} />
			<Route path="*" element={<Navigate replace to={`sprint/${startOfSprint(new Date())}`} />} />
		</Routes>
	);
}

function Workspace() {
	const { sprintStart: rawSprintStart = "" } = useParams();
	const sprintStart = isoDateSchema.safeParse(rawSprintStart).success ? startOfSprint(rawSprintStart) : startOfSprint(new Date());
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const client = useQueryClient();
	const tasksQuery = useQuery(sprintTasksQuery(sprintStart));
	const categoriesQueryResult = useQuery(categoriesQuery());
	const mutations = useTaskMutations();
	const [view, setViewState] = useState<View>(() => (localStorage.getItem("sprintly-view") === "kanban" ? "kanban" : "list"));
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase("zh-TW"));
	const [editingTask, setEditingTask] = useState<Task | null>(null);
	const [taskDialogOpen, setTaskDialogOpen] = useState(searchParams.get("action") === "new");
	const [categoriesOpen, setCategoriesOpen] = useState(false);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const scrollRef = useRef<HTMLElement>(null);
	const tasks = tasksQuery.data?.tasks ?? [];
	const categories = categoriesQueryResult.data ?? [];

	const setView = useCallback((next: View) => {
		startTransition(() => setViewState(next));
		localStorage.setItem("sprintly-view", next);
	}, []);
	const goToSprint = useCallback((next: string) => navigate(`/app/sprint/${next}`), [navigate]);
	const goRelative = useCallback((weeks: number) => goToSprint(addDays(sprintStart, weeks * 7)), [goToSprint, sprintStart]);

	useSprintBoundaryNavigation(
		scrollRef,
		() => goRelative(-1),
		() => goRelative(1)
	);

	useEffect(() => {
		const adjacent = [addDays(sprintStart, -7), addDays(sprintStart, 7)];
		void Promise.all(adjacent.map(date => client.prefetchQuery(sprintTasksQuery(date))));
	}, [client, sprintStart]);

	useEffect(() => {
		const handler = (event: globalThis.KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
			if (event.key.toLowerCase() === "n") {
				event.preventDefault();
				setEditingTask(null);
				setTaskDialogOpen(true);
			} else if (event.key === "/") {
				event.preventDefault();
				searchRef.current?.focus();
			} else if (event.key === "1") {
				setView("list");
			} else if (event.key === "2") {
				setView("kanban");
			} else if (event.key === "[") {
				goRelative(-1);
			} else if (event.key === "]") {
				goRelative(1);
			} else if (event.key === "?") {
				setShortcutsOpen(true);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [goRelative, setView]);

	useEffect(() => {
		if (searchParams.get("action") === "new") {
			setEditingTask(null);
			setTaskDialogOpen(true);
			setSearchParams({}, { replace: true });
		}
	}, [searchParams, setSearchParams]);

	const filteredTasks = useMemo(() => {
		if (!deferredSearch) return tasks;
		return tasks.filter(task => {
			const category = categories.find(item => item.id === task.categoryId)?.name ?? "";
			return `${task.title} ${task.description} ${category}`.toLocaleLowerCase("zh-TW").includes(deferredSearch);
		});
	}, [categories, deferredSearch, tasks]);
	const categoryMap = useMemo(() => new Map(categories.map(category => [category.id, category])), [categories]);
	const syncStates = useSyncStates();

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveTask(null);
		const task = event.active.data.current?.task as Task | undefined;
		const target = String(event.over?.id ?? "");
		if (!task || !target) return;
		if (target.startsWith("status:")) {
			const status = target.slice(7) as Task["status"];
			if (status !== task.status) mutations.update.mutate({ taskId: task.id, input: { version: task.version, status } });
		} else if (target.startsWith("place:")) {
			const [, nextSprint, day] = target.split(":");
			if (!nextSprint || !day) return;
			const scheduledDate = day === "inbox" ? null : day;
			if (nextSprint !== task.sprintStart || scheduledDate !== task.scheduledDate) {
				mutations.update.mutate({
					taskId: task.id,
					input: { version: task.version, sprintStart: nextSprint, scheduledDate }
				});
				if (nextSprint !== sprintStart) goToSprint(nextSprint);
			}
		}
	};

	const openEdit = (task: Task) => {
		setEditingTask(task);
		setTaskDialogOpen(true);
	};
	const closeTaskDialog = () => {
		setTaskDialogOpen(false);
		setEditingTask(null);
	};
	const handleCreate = (input: CreateTaskInput) => {
		mutations.create.mutate({ input, optimisticId: `optimistic-${crypto.randomUUID()}` });
		closeTaskDialog();
	};
	const handleUpdate = (taskId: string, input: UpdateTaskInput) => {
		mutations.update.mutate({ taskId, input });
		closeTaskDialog();
	};
	const handleDelete = (task: Task) => {
		mutations.remove.mutate({ taskId: task.id });
		closeTaskDialog();
	};
	const toggleTask = (task: Task) =>
		mutations.update.mutate({
			taskId: task.id,
			input: { version: task.version, status: task.status === "DONE" ? "TODO" : "DONE" }
		});

	if (sprintStart !== rawSprintStart) {
		return <Navigate replace to={`/app/sprint/${sprintStart}`} />;
	}

	const completed = tasks.filter(task => task.status === "DONE").length;
	const estimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedHours ?? 0), 0);

	return (
		<DndContext
			collisionDetection={closestCenter}
			onDragCancel={() => setActiveTask(null)}
			onDragEnd={handleDragEnd}
			onDragStart={(event: DragStartEvent) => setActiveTask(event.active.data.current?.task as Task)}
			sensors={sensors}
		>
			<div className="app-shell">
				<aside className="nav-drawer">
					<Brand />
					<button className="button button--fab-extended" onClick={() => setTaskDialogOpen(true)}>
						<Icon name="add" /> 新增項目
					</button>
					<nav aria-label="主要導覽" className="primary-nav">
						<button aria-current="page" className="nav-item nav-item--active" onClick={() => goToSprint(startOfSprint(new Date()))}>
							<Icon name="calendar" /> <span>我的 Sprint</span>
						</button>
						<button className="nav-item" onClick={() => setCategoriesOpen(true)}>
							<Icon name="settings" /> <span>分類</span>
						</button>
						<button className="nav-item" onClick={() => setShortcutsOpen(true)}>
							<Icon name="help" /> <span>快捷鍵</span>
						</button>
					</nav>
					<SprintSummary completed={completed} estimatedHours={estimatedHours} total={tasks.length} />
					<LogoutButton />
				</aside>

				<aside className="nav-rail">
					<Brand compact />
					<button aria-label="新增項目" className="fab" onClick={() => setTaskDialogOpen(true)} title="新增項目 (N)">
						<Icon name="add" />
					</button>
					<nav aria-label="主要導覽">
						<button aria-current="page" className="rail-item rail-item--active" onClick={() => goToSprint(startOfSprint(new Date()))}>
							<Icon name="calendar" />
							<span>Sprint</span>
						</button>
						<button className="rail-item" onClick={() => setCategoriesOpen(true)}>
							<Icon name="settings" />
							<span>分類</span>
						</button>
						<button className="rail-item" onClick={() => setShortcutsOpen(true)}>
							<Icon name="help" />
							<span>快捷鍵</span>
						</button>
					</nav>
				</aside>

				<main className="workspace" ref={scrollRef}>
					<header className="top-app-bar">
						<div className="mobile-brand">
							<Brand compact />
						</div>
						<div className="top-app-bar__title">
							<p>每週一開始</p>
							<h1>{formatSprintLabel(sprintStart)}</h1>
						</div>
						<SyncIndicator />
						<button aria-label="新增項目" className="mobile-add" onClick={() => setTaskDialogOpen(true)}>
							<Icon name="add" />
						</button>
					</header>

					<section className="workspace-content">
						<SprintTabs current={sprintStart} onSelect={goToSprint} />
						<div className="workspace-toolbar">
							<label className="search-field">
								<Icon name="search" />
								<span className="sr-only">搜尋項目</span>
								<input onChange={event => setSearch(event.target.value)} placeholder="搜尋這個 sprint…  /" ref={searchRef} value={search} />
								{search ? (
									<button aria-label="清除搜尋" onClick={() => setSearch("")} type="button">
										<Icon name="close" />
									</button>
								) : null}
							</label>
							<div aria-label="檢視方式" className="segmented" role="group">
								<button aria-pressed={view === "list"} onClick={() => setView("list")} title="清單 (1)">
									<Icon name="list" /> <span>清單</span>
								</button>
								<button aria-pressed={view === "kanban"} onClick={() => setView("kanban")} title="Kanban (2)">
									<Icon name="board" /> <span>Kanban</span>
								</button>
							</div>
						</div>

						{search ? <p className="search-results">找到 {filteredTasks.length} 個項目</p> : null}
						{tasksQuery.isPending && !tasksQuery.data ? (
							<div className="content-loading" aria-busy="true" id="sprint-panel" role="tabpanel">
								<Spinner label="正在載入 sprint" />
								<p>正在整理這一週</p>
							</div>
						) : tasksQuery.isError && !tasksQuery.data ? (
							<div className="error-state" id="sprint-panel" role="tabpanel">
								<h2>暫時讀不到這個 sprint</h2>
								<p>{tasksQuery.error.message}</p>
								<button className="button button--filled-tonal" onClick={() => tasksQuery.refetch()}>
									重試
								</button>
							</div>
						) : (
							<div className="view-stage" id="sprint-panel" key={view} role="tabpanel">
								{view === "list" ? (
									<ListView categories={categoryMap} onEdit={openEdit} onToggle={toggleTask} sprintStart={sprintStart} syncStates={syncStates} tasks={filteredTasks} />
								) : (
									<KanbanView categories={categoryMap} onEdit={openEdit} onToggle={toggleTask} syncStates={syncStates} tasks={filteredTasks} />
								)}
							</div>
						)}
						<div className="scroll-boundary-hint">繼續向下捲動，前往下一個 sprint</div>
					</section>
				</main>

				<nav aria-label="手機導覽" className="bottom-nav">
					<button aria-current="page" onClick={() => goToSprint(startOfSprint(new Date()))}>
						<span className="bottom-nav__indicator">
							<Icon name="calendar" />
						</span>
						<span>Sprint</span>
					</button>
					<button onClick={() => setCategoriesOpen(true)}>
						<span className="bottom-nav__indicator">
							<Icon name="settings" />
						</span>
						<span>分類</span>
					</button>
					<button onClick={() => setShortcutsOpen(true)}>
						<span className="bottom-nav__indicator">
							<Icon name="help" />
						</span>
						<span>快捷鍵</span>
					</button>
				</nav>

				<TaskDialog
					categories={categories}
					defaultSprintStart={sprintStart}
					onClose={closeTaskDialog}
					onCreate={handleCreate}
					onDelete={handleDelete}
					onUpdate={handleUpdate}
					open={taskDialogOpen}
					pending={false}
					task={editingTask}
				/>
				<CategoryDialog categories={categories} onClose={() => setCategoriesOpen(false)} open={categoriesOpen} />
				<ShortcutDialog onClose={() => setShortcutsOpen(false)} open={shortcutsOpen} />
			</div>
			<DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>{activeTask ? <div className="drag-overlay">{activeTask.title}</div> : null}</DragOverlay>
		</DndContext>
	);
}

function SprintTabs({ current, onSelect }: { current: string; onSelect: (date: string) => void }) {
	const dates = [addDays(current, -7), current, addDays(current, 7)];
	const handleKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		event.preventDefault();
		const direction = event.key === "ArrowRight" ? 1 : -1;
		const target = dates[index + direction];
		if (target) onSelect(target);
	};
	return (
		<div aria-label="Sprint 切換" className="sprint-tabs" role="tablist">
			{dates.map((date, index) => (
				<SprintTab current={date === current} date={date} index={index} key={date} onKeyDown={event => handleKey(event, index)} onSelect={onSelect} />
			))}
		</div>
	);
}

function SprintTab({
	current,
	date,
	index,
	onKeyDown,
	onSelect
}: {
	current: boolean;
	date: string;
	index: number;
	onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
	onSelect: (date: string) => void;
}) {
	const { isOver, setNodeRef } = useDroppable({ id: `place:${date}:inbox` });
	return (
		<button
			aria-controls="sprint-panel"
			aria-selected={current}
			className={`${current ? "is-selected" : ""}${isOver ? " drop-target" : ""}`}
			onClick={() => onSelect(date)}
			onKeyDown={onKeyDown}
			ref={setNodeRef}
			role="tab"
			tabIndex={current ? 0 : -1}
		>
			<span>{index === 0 ? "上一週" : index === 1 ? "這個 Sprint" : "下一週"}</span>
			<strong>{formatSprintRange(date)}</strong>
		</button>
	);
}

function Brand({ compact = false }: { compact?: boolean }) {
	return (
		<div className={`brand${compact ? " brand--compact" : ""}`}>
			<div aria-hidden="true" className="brand-mark">
				<span />
			</div>
			{compact ? null : (
				<div>
					<strong>Sprintly</strong>
					<small>每週待辦</small>
				</div>
			)}
		</div>
	);
}

function SprintSummary({ completed, estimatedHours, total }: { completed: number; estimatedHours: number; total: number }) {
	const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
	return (
		<section className="sprint-summary" aria-label="Sprint 摘要">
			<div>
				<span>本週進度</span>
				<strong>
					{completed}/{total}
				</strong>
			</div>
			<div aria-label={`完成 ${progress}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="progress" role="progressbar">
				<i style={{ width: `${progress}%` }} />
			</div>
			<p>預估 {estimatedHours} 小時</p>
		</section>
	);
}

function LogoutButton() {
	const client = useQueryClient();
	const mutation = useMutation({
		mutationFn: logout,
		onSuccess: async () => {
			client.clear();
			await persister.removeClient();
			window.location.assign("/login");
		}
	});
	return (
		<button className="logout-button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
			<Icon name="logout" /> 登出
		</button>
	);
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

function useSprintBoundaryNavigation(ref: React.RefObject<HTMLElement | null>, previous: () => void, next: () => void) {
	const accumulation = useRef(0);
	const lastDirection = useRef(0);
	const touchStart = useRef<number | null>(null);
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		let timer = 0;
		const resetSoon = () => {
			window.clearTimeout(timer);
			timer = window.setTimeout(() => (accumulation.current = 0), 240);
		};
		const consume = (direction: number, amount: number) => {
			if (direction !== lastDirection.current) accumulation.current = 0;
			lastDirection.current = direction;
			accumulation.current += amount;
			if (accumulation.current > 180) {
				accumulation.current = 0;
				direction < 0 ? previous() : next();
			}
			resetSoon();
		};
		const wheel = (event: WheelEvent) => {
			const atTop = element.scrollTop <= 1;
			const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
			if (event.deltaY < 0 && atTop) consume(-1, Math.abs(event.deltaY));
			else if (event.deltaY > 0 && atBottom) consume(1, Math.abs(event.deltaY));
			else accumulation.current = 0;
		};
		const touchstart = (event: TouchEvent) => {
			touchStart.current = event.touches[0]?.clientY ?? null;
		};
		const touchmove = (event: TouchEvent) => {
			const current = event.touches[0]?.clientY;
			if (current === undefined || touchStart.current === null) return;
			const delta = touchStart.current - current;
			const atTop = element.scrollTop <= 1;
			const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
			if (delta < 0 && atTop) consume(-1, Math.abs(delta) / 4);
			else if (delta > 0 && atBottom) consume(1, Math.abs(delta) / 4);
			touchStart.current = current;
		};
		element.addEventListener("wheel", wheel, { passive: true });
		element.addEventListener("touchstart", touchstart, { passive: true });
		element.addEventListener("touchmove", touchmove, { passive: true });
		return () => {
			window.clearTimeout(timer);
			element.removeEventListener("wheel", wheel);
			element.removeEventListener("touchstart", touchstart);
			element.removeEventListener("touchmove", touchmove);
		};
	}, [next, previous, ref]);
}
