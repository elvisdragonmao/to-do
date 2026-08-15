import type { Category } from "@em-todo/shared";

const ORDER_STEP = 1024;

export function categorySortOrderAfterMove(categories: Category[], activeId: string, overId: string): number | null {
	const activeIndex = categories.findIndex(category => category.id === activeId);
	const overIndex = categories.findIndex(category => category.id === overId);
	if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return null;

	const reordered = [...categories];
	const [active] = reordered.splice(activeIndex, 1);
	if (!active) return null;
	reordered.splice(overIndex, 0, active);
	const nextIndex = reordered.findIndex(category => category.id === activeId);
	const previous = reordered[nextIndex - 1];
	const next = reordered[nextIndex + 1];

	if (!previous && next) return next.sortOrder - ORDER_STEP;
	if (previous && !next) return previous.sortOrder + ORDER_STEP;
	if (previous && next) return (previous.sortOrder + next.sortOrder) / 2;
	return active.sortOrder;
}
