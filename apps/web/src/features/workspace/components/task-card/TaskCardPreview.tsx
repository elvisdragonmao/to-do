import type { Category, Task } from "@em-todo/shared";

import { Icon } from "../../../../shared/components/icon/Icon.js";
import { formatShortDate } from "../../../../shared/utils/date-format.js";
import { linkify } from "../../../../shared/utils/linkify.js";
import { CategoryTag } from "./CategoryTag.js";
import { urgencyClass } from "./TaskCardActions.js";
import actionStyles from "./TaskCardActions.module.css";
import cardStyles from "./TaskCard.module.css";
import styles from "./TaskCardPreview.module.css";
import textStyles from "./TaskCardText.module.css";

export function TaskCardPreview({ category, pagerPreview = false, railTargeted = false, task }: { category: Category | undefined; pagerPreview?: boolean; railTargeted?: boolean; task: Task }) {
	return (
		<article
			className={[cardStyles.card, pagerPreview ? cardStyles.pagerPreview : cardStyles.overlay, railTargeted ? cardStyles.railOverlay : "", task.status === "DONE" ? cardStyles.done : ""]
				.filter(Boolean)
				.join(" ")}
		>
			<header className={textStyles.header}>
				<strong className={textStyles.title}>{task.title}</strong>
				<div className={actionStyles.actions}>
					<CategoryTag categories={[]} category={category} value={task.categoryId} />
					<span className={`${actionStyles.urgencyFlag} ${urgencyClass(task.urgency)}`}>
						<Icon name="flag" />
					</span>
				</div>
			</header>
			{task.description ? <div className={textStyles.description}>{pagerPreview ? task.description : linkify(task.description)}</div> : null}
			<div className={styles.meta}>
				{task.estimatedHours === null ? null : <span>{task.estimatedHours}h</span>}
				{task.dueDate ? <span>{formatShortDate(task.dueDate)}</span> : null}
			</div>
		</article>
	);
}
