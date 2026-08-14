import { describe, expect, it } from "vitest";

import { addDays, resolvePlacementHistory, sprintDays, startOfSprint } from "./index.js";

describe("sprint dates", () => {
	it("starts every sprint on Monday, including Sundays", () => {
		expect(startOfSprint("2026-08-13")).toBe("2026-08-10");
		expect(startOfSprint("2026-08-16")).toBe("2026-08-10");
		expect(startOfSprint("2026-08-17")).toBe("2026-08-17");
	});

	it("enumerates the complete Monday-to-Sunday sprint", () => {
		expect(sprintDays("2026-08-10")).toEqual(["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"]);
		expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
	});
});

describe("placement history", () => {
	const task = {
		isBacklog: false,
		sprintStart: "2026-08-10",
		initialPlannedDate: "2026-08-10"
	};

	it("refines a sprint-level initial plan when first placed on a day", () => {
		expect(resolvePlacementHistory(task, "2026-08-10", "2026-08-13")).toEqual({
			initialPlannedDate: "2026-08-13",
			lastPlannedDate: "2026-08-13"
		});
	});

	it("preserves the initial plan when moved to another sprint", () => {
		expect(resolvePlacementHistory(task, "2026-08-17", "2026-08-18")).toEqual({
			initialPlannedDate: "2026-08-10",
			lastPlannedDate: "2026-08-18"
		});
	});

	it("sets the initial plan when a backlog item enters a sprint", () => {
		expect(resolvePlacementHistory({ ...task, isBacklog: true }, "2026-08-17", "2026-08-19")).toEqual({
			initialPlannedDate: "2026-08-19",
			lastPlannedDate: "2026-08-19"
		});
	});
});
