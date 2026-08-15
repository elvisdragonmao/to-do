import type { Category, Task } from "@em-todo/shared";

import { CountBadge } from "@/shared/components/count-badge/CountBadge.js";
import { Icon } from "@/shared/components/icon/Icon.js";
import { TaskCardPreview } from "../task-card/TaskCardPreview.js";
import { STATUS_TARGETS, tasksForTarget, weekTargets, type ViewMode } from "@/features/workspace/models/workspace-model.js";
import pageStyles from "./SprintPage.module.css";
import styles from "./TaskBoard.module.css";

export function SprintPreviewPage({ categories, sprintStart, tasks, view }: { categories: Category[]; sprintStart: string; tasks: Task[]; view: Exclude<ViewMode, "list"> }) {
	const targets = view === "kanban" ? STATUS_TARGETS : weekTargets(sprintStart);

	return (
		<section aria-hidden="true" className={[pageStyles.page, pageStyles.preview].join(" ")} data-sprint-page data-sprint-start={sprintStart}>
			<div className={[styles.board, view === "kanban" ? styles.kanban : styles.week].join(" ")}>
				{targets.map(target => {
					const previewTasks = tasksForTarget(tasks, target);
					return (
						<section className={styles.column} key={target.id}>
							<header className={styles.header}>
								<div>
									<h2>{target.label}</h2>
								</div>
								<CountBadge>{previewTasks.length}</CountBadge>
								<span aria-hidden="true" className={styles.add}>
									<Icon name="add" />
								</span>
							</header>
							<div className={styles.tasks}>
								{previewTasks.map(task => (
									<TaskCardPreview category={categories.find(category => category.id === task.categoryId)} key={task.id} pagerPreview task={task} />
								))}
								{previewTasks.length === 0 ? (
									<div aria-hidden="true" className={styles.empty}>
										<Icon name="add" />
										新增
									</div>
								) : null}
							</div>
						</section>
					);
				})}
			</div>
		</section>
	);
}
