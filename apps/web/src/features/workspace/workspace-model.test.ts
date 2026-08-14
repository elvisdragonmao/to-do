import { describe, expect, it } from "vitest";

import { parseCompactDate } from "../../date-format.js";
import { createInputForTarget, numberedTargets, weekTargets } from "./workspace-model.js";

describe("quick create", () => {
	it("maps Kanban numbers to statuses and backlog categories", () => {
		const targets = numberedTargets("kanban", "2026-08-17", [{ id: "study", name: "Study", color: "#DD8406", isDefault: false, createdAt: "2026-08-01", sortOrder: 1 }]);
		expect(targets.map(target => [target.key, target.label])).toEqual([
			["1", "To Do"],
			["2", "In Progress"],
			["3", "Done"],
			["4", "Study"]
		]);
	});

	it("maps week numbers from inbox through Sunday", () => {
		const targets = numberedTargets("week", "2026-08-17", []);
		expect(targets[0]).toMatchObject({ key: "0", label: "Inbox", scheduledDate: null });
		expect(targets[7]).toMatchObject({ key: "7", label: "Sunday", scheduledDate: "2026-08-23" });
	});

	it("creates a task from the compact title, time, and deadline flow", () => {
		const dueDate = parseCompactDate("20260830");
		const input = createInputForTarget({
			categoryId: "uncategorized",
			dueDate,
			estimatedHours: 1.5,
			sprintStart: "2026-08-17",
			target: weekTargets("2026-08-17")[1]!,
			title: "Study Physics"
		});
		expect(input).toMatchObject({ title: "Study Physics", estimatedHours: 1.5, dueDate: "2026-08-30", scheduledDate: "2026-08-17" });
	});
});
