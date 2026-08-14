import { addDays, sprintDays, type Category, type CreateTaskInput, type Task, type TaskStatus, type UpdateTaskInput } from "@em-todo/shared";

export type ViewMode = "kanban" | "list" | "week";

export type PlacementTarget =
	| { id: string; kind: "status"; label: string; status: TaskStatus }
	| { id: string; kind: "day"; label: string; scheduledDate: string | null; sprintStart: string }
	| { id: string; kind: "category"; label: string; categoryId: string };

export type NumberedTarget = PlacementTarget & { key: string };

export const STATUS_TARGETS: PlacementTarget[] = [
	{ id: "status:TODO", kind: "status", label: "To Do", status: "TODO" },
	{ id: "status:DOING", kind: "status", label: "In Progress", status: "DOING" },
	{ id: "status:DONE", kind: "status", label: "Done", status: "DONE" }
];

export function weekTargets(sprintStart: string): PlacementTarget[] {
	return [
		{ id: "day:inbox", kind: "day", label: "Inbox", scheduledDate: null, sprintStart },
		...sprintDays(sprintStart).map((date, index) => ({
			id: `day:${date}`,
			kind: "day" as const,
			label: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index]!,
			scheduledDate: date,
			sprintStart
		}))
	];
}

export function numberedTargets(view: ViewMode, sprintStart: string, categories: Category[]): NumberedTarget[] {
	if (view === "week") return weekTargets(sprintStart).map((target, index) => ({ ...target, key: String(index) }));
	const statuses = STATUS_TARGETS.map((target, index) => ({ ...target, key: String(index + 1) }));
	const backlog = categories.slice(0, 6).map((category, index) => ({
		id: `category:${category.id}`,
		kind: "category" as const,
		label: category.name,
		categoryId: category.id,
		key: String(index + 4)
	}));
	return [...statuses, ...backlog];
}

export function createInputForTarget({
	categoryId,
	description,
	dueDate,
	estimatedHours,
	sprintStart,
	target,
	title
}: {
	categoryId: string;
	description: string;
	dueDate: string | null;
	estimatedHours: number | null;
	sprintStart: string;
	target: PlacementTarget;
	title: string;
}): CreateTaskInput {
	return {
		title,
		description,
		isBacklog: target.kind === "category",
		sprintStart: target.kind === "day" ? target.sprintStart : sprintStart,
		scheduledDate: target.kind === "day" ? target.scheduledDate : null,
		categoryId: target.kind === "category" ? target.categoryId : categoryId,
		urgency: 2,
		estimatedHours,
		dueDate,
		status: target.kind === "status" ? target.status : "TODO"
	};
}

export function updateForTarget(task: Task, target: PlacementTarget, sortOrder: number, sprintStart = task.sprintStart): UpdateTaskInput {
	const placement =
		target.kind === "day"
			? { isBacklog: false, scheduledDate: target.scheduledDate, sprintStart: target.sprintStart }
			: target.kind === "status"
				? { isBacklog: false, sprintStart, status: target.status }
				: { categoryId: target.categoryId, isBacklog: true, scheduledDate: null, status: "TODO" as const };
	return { version: task.version, sortOrder, ...placement };
}

export function tasksForTarget(tasks: Task[], target: PlacementTarget): Task[] {
	return tasks
		.filter(task => {
			if (target.kind === "status") return task.status === target.status;
			if (target.kind === "day") return task.scheduledDate === target.scheduledDate;
			return task.categoryId === target.categoryId;
		})
		.toSorted((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt));
}

export function sortOrderBefore(tasks: Task[], beforeTaskId?: string): number {
	if (tasks.length === 0) return Date.now();
	if (!beforeTaskId) return tasks[tasks.length - 1]!.sortOrder + 1024;
	const index = tasks.findIndex(task => task.id === beforeTaskId);
	if (index <= 0) return tasks[0]!.sortOrder - 1024;
	return (tasks[index - 1]!.sortOrder + tasks[index]!.sortOrder) / 2;
}

export function adjacentSprint(sprintStart: string, direction: -1 | 1): string {
	return addDays(sprintStart, direction * 7);
}
