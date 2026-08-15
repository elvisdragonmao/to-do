import { Icon } from "@/shared/components/icon/Icon.js";
import type { ViewMode } from "@/features/workspace/models/workspace-model.js";
import styles from "./ViewToggle.module.css";

export function ViewToggle({ onChange, value }: { onChange: (view: ViewMode) => void; value: ViewMode }) {
	return (
		<div aria-label="切換 View" className={styles.toggle} role="group">
			<button aria-label="Kanban View" aria-pressed={value === "kanban"} onClick={() => onChange("kanban")} title="Kanban View (1)" type="button">
				<Icon name="board" />
			</button>
			<button aria-label="星期 View" aria-pressed={value === "week"} onClick={() => onChange("week")} title="星期 View (2)" type="button">
				<Icon name="list" />
			</button>
			<button aria-label="List View" aria-pressed={value === "list"} onClick={() => onChange("list")} title="List View (3)" type="button">
				<Icon name="table" />
			</button>
		</div>
	);
}
