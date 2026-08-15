import type { Task } from "@em-todo/shared";

export type TaskSortDirection = "asc" | "desc";
export type TaskSortKey = "title" | "status" | "urgency" | "created" | "planned" | "hours" | "due" | "completed";

const STATUS_ORDER: Record<Task["status"], number> = { TODO: 0, DOING: 1, DONE: 2 };

export function sortTasks(tasks: Task[], key: TaskSortKey, direction: TaskSortDirection): Task[] {
	return tasks.toSorted((left, right) => {
		const leftValue = sortValue(left, key);
		const rightValue = sortValue(right, key);
		if (leftValue === null && rightValue === null) return stableOrder(left, right);
		if (leftValue === null) return 1;
		if (rightValue === null) return -1;
		const comparison = typeof leftValue === "number" && typeof rightValue === "number" ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue), "zh-TW", { numeric: true });
		return comparison === 0 ? stableOrder(left, right) : direction === "asc" ? comparison : -comparison;
	});
}

function sortValue(task: Task, key: TaskSortKey): number | string | null {
	switch (key) {
		case "title":
			return task.title;
		case "status":
			return task.isBacklog ? -1 : STATUS_ORDER[task.status];
		case "urgency":
			return task.urgency;
		case "created":
			return task.createdAt;
		case "planned":
			return task.isBacklog ? null : (task.scheduledDate ?? task.sprintStart);
		case "hours":
			return task.estimatedHours;
		case "due":
			return task.dueDate;
		case "completed":
			return task.completedDate;
	}
}

function stableOrder(left: Task, right: Task): number {
	return left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt);
}
