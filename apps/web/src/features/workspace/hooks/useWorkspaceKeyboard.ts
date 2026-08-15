import { useEffect } from "react";

import type { ViewMode } from "../models/workspace-model.js";

type Direction = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

export function useWorkspaceKeyboard({
	onCreate,
	onEscape,
	onFocusSearch,
	onMoveSelection,
	onNextSprint,
	onOpenShortcuts,
	onPreviousSprint,
	onSelectTarget,
	onSetView,
	onToday,
	targeting
}: {
	onCreate: () => void;
	onEscape: () => void;
	onFocusSearch: () => void;
	onMoveSelection: (direction: Direction) => void;
	onNextSprint: () => void;
	onOpenShortcuts: () => void;
	onPreviousSprint: () => void;
	onSelectTarget: (key: string) => boolean;
	onSetView: (view: ViewMode) => void;
	onToday: () => void;
	targeting: boolean;
}) {
	useEffect(() => {
		const handler = (event: globalThis.KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			const editable = target?.matches("input, textarea, select, [contenteditable='true']");
			if ((event.metaKey || event.ctrlKey) && event.code === "Slash") {
				event.preventDefault();
				onOpenShortcuts();
				return;
			}
			if (editable) return;
			if (event.key === "Escape") {
				event.preventDefault();
				onEscape();
				return;
			}
			if (targeting && /^\d$/.test(event.key) && onSelectTarget(event.key)) {
				event.preventDefault();
				return;
			}
			if (event.key.toLowerCase() === "n") {
				event.preventDefault();
				onCreate();
			} else if (event.key === "/") {
				event.preventDefault();
				onFocusSearch();
			} else if (event.key === "1") {
				event.preventDefault();
				onSetView("kanban");
			} else if (event.key === "2") {
				event.preventDefault();
				onSetView("week");
			} else if (event.key === "3") {
				event.preventDefault();
				onSetView("list");
			} else if (event.key.toLowerCase() === "t") {
				event.preventDefault();
				onToday();
			} else if (event.key === "[") {
				event.preventDefault();
				onPreviousSprint();
			} else if (event.key === "]") {
				event.preventDefault();
				onNextSprint();
			} else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
				event.preventDefault();
				onMoveSelection(event.key as Direction);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onCreate, onEscape, onFocusSearch, onMoveSelection, onNextSprint, onOpenShortcuts, onPreviousSprint, onSelectTarget, onSetView, onToday, targeting]);
}

export function findDirectionalTask(selectedTaskId: string | null, direction: Direction): HTMLElement | null {
	const cards = [...document.querySelectorAll<HTMLElement>("[data-task-card]")].filter(element => element.offsetParent !== null);
	if (cards.length === 0) return null;
	const current = cards.find(element => element.dataset.taskId === selectedTaskId) ?? cards[0]!;
	if (!selectedTaskId) return current;
	const source = current.getBoundingClientRect();
	const sourceX = source.left + source.width / 2;
	const sourceY = source.top + source.height / 2;
	let best: { element: HTMLElement; score: number } | null = null;

	for (const candidate of cards) {
		if (candidate === current) continue;
		const rect = candidate.getBoundingClientRect();
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;
		const dx = x - sourceX;
		const dy = y - sourceY;
		const valid = direction === "ArrowUp" ? dy < -2 : direction === "ArrowDown" ? dy > 2 : direction === "ArrowLeft" ? dx < -2 : dx > 2;
		if (!valid) continue;
		const primary = direction === "ArrowUp" || direction === "ArrowDown" ? Math.abs(dy) : Math.abs(dx);
		const secondary = direction === "ArrowUp" || direction === "ArrowDown" ? Math.abs(dx) : Math.abs(dy);
		const score = primary + secondary * 2.4;
		if (!best || score < best.score) best = { element: candidate, score };
	}
	return best?.element ?? null;
}
