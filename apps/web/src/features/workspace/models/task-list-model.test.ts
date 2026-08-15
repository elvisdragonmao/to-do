import type { Task } from "@em-todo/shared";
import { describe, expect, it } from "vitest";

import { sortTasks, taskListStatus, updateForListPlannedDate, updateForListStatus } from "./task-list-model.js";

const base: Task = {
	id: "base",
	title: "Base",
	description: "",
	createdAt: "2026-08-01T00:00:00.000Z",
	updatedAt: "2026-08-01T00:00:00.000Z",
	isBacklog: false,
	sprintStart: "2026-08-10",
	scheduledDate: "2026-08-11",
	initialPlannedDate: "2026-08-11",
	lastPlannedDate: "2026-08-11",
	categoryId: "uncategorized",
	urgency: 2,
	estimatedHours: 1,
	dueDate: "2026-08-20",
	completedDate: null,
	status: "TODO",
	sortOrder: 1,
	version: 1
};

describe("task list sorting", () => {
	it("sorts either direction while keeping missing values last", () => {
		const withoutDueDate = { ...base, id: "none", title: "No deadline", dueDate: null };
		const later = { ...base, id: "later", title: "Later", dueDate: "2026-08-30" };

		expect(sortTasks([withoutDueDate, later, base], "due", "asc").map(task => task.id)).toEqual(["base", "later", "none"]);
		expect(sortTasks([withoutDueDate, later, base], "due", "desc").map(task => task.id)).toEqual(["later", "base", "none"]);
	});

	it("places backlog before sprint statuses and treats it as unplanned", () => {
		const backlog = { ...base, id: "backlog", isBacklog: true };
		const doing = { ...base, id: "doing", status: "DOING" as const };

		expect(sortTasks([doing, backlog, base], "status", "asc").map(task => task.id)).toEqual(["backlog", "base", "doing"]);
		expect(sortTasks([backlog, base], "planned", "asc").map(task => task.id)).toEqual(["base", "backlog"]);
	});
});

describe("task list editing", () => {
	it("moves tasks between backlog and sprint statuses", () => {
		expect(taskListStatus({ ...base, isBacklog: true })).toBe("BACKLOG");
		expect(updateForListStatus(base, "BACKLOG")).toEqual({ version: 1, isBacklog: true, scheduledDate: null, status: "TODO" });
		expect(updateForListStatus({ ...base, isBacklog: true }, "DOING")).toEqual({ version: 1, isBacklog: false, status: "DOING" });
	});

	it("moves a planned date to its matching sprint and can clear it", () => {
		expect(updateForListPlannedDate(base, "2026-08-23")).toEqual({
			version: 1,
			isBacklog: false,
			scheduledDate: "2026-08-23",
			sprintStart: "2026-08-17"
		});
		expect(updateForListPlannedDate(base, "")).toEqual({ version: 1, scheduledDate: null });
	});
});
