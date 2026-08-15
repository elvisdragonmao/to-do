import type { Category } from "@em-todo/shared";
import { describe, expect, it } from "vitest";

import { categorySortOrderAfterMove } from "./category-order.js";

const categories = [category("first", 0), category("second", 1024), category("third", 2048), category("fourth", 3072)];

describe("categorySortOrderAfterMove", () => {
	it("places a category before the first category", () => {
		expect(categorySortOrderAfterMove(categories, "third", "first")).toBe(-1024);
	});

	it("places a category between its new neighbours", () => {
		expect(categorySortOrderAfterMove(categories, "first", "third")).toBe(2560);
	});

	it("places a category after the last category", () => {
		expect(categorySortOrderAfterMove(categories, "second", "fourth")).toBe(4096);
	});

	it("ignores a drop on the same or an unknown category", () => {
		expect(categorySortOrderAfterMove(categories, "second", "second")).toBeNull();
		expect(categorySortOrderAfterMove(categories, "missing", "second")).toBeNull();
	});
});

function category(id: string, sortOrder: number): Category {
	return { id, sortOrder, name: id, color: "#1E88E5", isDefault: false, createdAt: "2026-08-15T00:00:00.000Z" };
}
