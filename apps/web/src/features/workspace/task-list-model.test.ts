import type { Task } from "@em-todo/shared";
import { describe, expect, it } from "vitest";

import { sortTasks } from "./task-list-model.js";

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
