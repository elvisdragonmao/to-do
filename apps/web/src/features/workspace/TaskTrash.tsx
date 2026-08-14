import { useDroppable } from "@dnd-kit/core";

import { Icon } from "../../icons.js";

export const TASK_TRASH_ID = "task-trash";

export function TaskTrash({ active }: { active: boolean }) {
	const { isOver, setNodeRef } = useDroppable({
		id: TASK_TRASH_ID,
		data: { type: "task-trash" },
		disabled: !active
	});

	return (
		<section aria-disabled={!active} aria-label="刪除項目放置區" aria-live="polite" className={`task-trash${active ? " is-active" : ""}${isOver ? " is-over" : ""}`} data-task-trash ref={setNodeRef}>
			<Icon name="trash" />
			<span>{isOver ? "放開刪除" : active ? "拖到這裡刪除" : "拖曳刪除"}</span>
		</section>
	);
}
