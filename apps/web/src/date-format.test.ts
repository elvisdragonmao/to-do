import { describe, expect, it } from "vitest";

import { formatDay, formatSprintLabel, formatSprintRange } from "./date-format.js";

describe("Traditional Chinese date formatting", () => {
	it("formats a Monday-to-Sunday sprint without depending on local timezone", () => {
		expect(formatSprintRange("2026-08-10")).toBe("8/10 – 8/16");
		expect(formatSprintLabel("2026-08-10")).toBe("2026 · 8/10 – 8/16");
	});

	it("formats individual days consistently", () => {
		expect(formatDay("2026-08-13")).toMatchObject({ weekday: "週四", date: "8/13" });
	});
});
