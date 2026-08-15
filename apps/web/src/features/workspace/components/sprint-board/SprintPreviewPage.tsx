import type { Category, Task } from "@em-todo/shared";

import { Icon } from "../../../../shared/components/icon/Icon.js";
import { TaskCardPreview } from "../task-card/TaskCardPreview.js";
import { STATUS_TARGETS, tasksForTarget, weekTargets, type ViewMode } from "../../models/workspace-model.js";

export function SprintPreviewPage({ categories, sprintStart, tasks, view }: { categories: Category[]; sprintStart: string; tasks: Task[]; view: Exclude<ViewMode, "list"> }) {
	const targets = view === "kanban" ? STATUS_TARGETS : weekTargets(sprintStart);

	return (
		<section aria-hidden="true" className="sprint-page sprint-page--preview" data-sprint-start={sprintStart}>
			<div className={`task-board task-board--${view}`}>
				{targets.map(target => {
					const previewTasks = tasksForTarget(tasks, target);
					return (
						<section className="board-column" key={target.id}>
							<header className="board-column__header">
								<div>
									<h2>{target.label}</h2>
								</div>
								<span className="count-badge">{previewTasks.length}</span>
								<span aria-hidden="true" className="column-add">
									<Icon name="add" />
								</span>
							</header>
							<div className="board-column__tasks">
								{previewTasks.map(task => (
									<TaskCardPreview category={categories.find(category => category.id === task.categoryId)} key={task.id} pagerPreview task={task} />
								))}
								{previewTasks.length === 0 ? (
									<div aria-hidden="true" className="empty-column">
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
