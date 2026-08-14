import type { Category, Task } from "@em-todo/shared";

import { Icon } from "../../../../icons.js";
import { formatShortDate } from "../../../../shared/utils/date-format.js";
import { linkify } from "../../../../shared/utils/linkify.js";
import { CategoryTag } from "./CategoryTag.js";
import { urgencyClass } from "./TaskCardActions.js";
import styles from "./TaskCard.module.css";

export function TaskCardPreview({ category, pagerPreview = false, railTargeted = false, task }: { category: Category | undefined; pagerPreview?: boolean; railTargeted?: boolean; task: Task }) {
	return (
		<article
			className={[styles.card, pagerPreview ? styles.pagerPreview : styles.overlay, railTargeted ? styles.railOverlay : "", task.status === "DONE" ? styles.done : ""].filter(Boolean).join(" ")}
		>
			<header className={styles.header}>
				<strong className={styles.titlePreview}>{task.title}</strong>
				<div className={styles.headerActions}>
					<CategoryTag categories={[]} category={category} value={task.categoryId} />
					<span className={`${styles.urgencyFlag} ${urgencyClass(task.urgency)}`}>
						<Icon name="flag" />
					</span>
				</div>
			</header>
			{task.description ? <div className={styles.descriptionPreview}>{pagerPreview ? task.description : linkify(task.description)}</div> : null}
			<div className={styles.previewMeta}>
				{task.estimatedHours === null ? null : <span>{task.estimatedHours}h</span>}
				{task.dueDate ? <span>{formatShortDate(task.dueDate)}</span> : null}
			</div>
		</article>
	);
}
