import type { MouseEvent, SyntheticEvent } from "react";

export function isEditableTarget(event: SyntheticEvent): boolean {
	return event.target instanceof HTMLElement && event.target.matches("input, textarea, select, [contenteditable='true']");
}

// Shift + 點擊在卡片上是多選，不要讓瀏覽器順便延伸文字選取。
export function preventShiftSelection(event: MouseEvent) {
	if (event.shiftKey && !isEditableTarget(event)) event.preventDefault();
}
