import type { Category, Task } from "@sprintly/shared";

import { formatShortDate, formatSprintLabel } from "../../date-format.js";
import { Icon } from "../../icons.js";
import { MiniCalendar } from "./MiniCalendar.js";
import { STATUS_TARGETS, tasksForTarget, weekTargets, type ViewMode } from "./workspace-model.js";

export function SprintPreviewPage({ categories, sprintStart, tasks, view }: { categories: Category[]; sprintStart: string; tasks: Task[]; view: ViewMode }) {
	const targets = view === "kanban" ? STATUS_TARGETS : weekTargets(sprintStart);

	return (
		<section aria-label={`${formatSprintLabel(sprintStart)} 預覽`} className="sprint-page sprint-page--preview">
			<header className="top-app-bar top-app-bar--preview">
				<h1>{formatSprintLabel(sprintStart)}</h1>
			</header>
			<div className="workspace-body">
				<section className="board-region">
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
									</header>
									<div className="board-column__tasks">
										{previewTasks.map(task => (
											<PreviewTaskCard category={categories.find(category => category.id === task.categoryId)} key={task.id} task={task} />
										))}
									</div>
								</section>
							);
						})}
					</div>
				</section>
				<MiniCalendar interactive={false} onSelectSprint={() => undefined} sprintStart={sprintStart} tasks={tasks} />
			</div>
		</section>
	);
}

function PreviewTaskCard({ category, task }: { category: Category | undefined; task: Task }) {
	return (
		<article className={`task-card task-card--pager-preview urgency-${task.urgency}${task.status === "DONE" ? " task-card--done" : ""}`}>
			<header className="task-card__header">
				<strong className="task-card__title-preview">{task.title}</strong>
				<span className="urgency-flag">
					<Icon name="flag" />
				</span>
			</header>
			{task.description ? <p className="task-card__description-preview">{task.description}</p> : null}
			<div className="task-card__preview-meta">
				<span>
					<i style={{ backgroundColor: category?.color ?? "var(--md-sys-color-outline)" }} />
					{category?.name ?? "未分類"}
				</span>
				{task.estimatedHours === null ? null : <span>{task.estimatedHours}h</span>}
				{task.dueDate ? <span>{formatShortDate(task.dueDate)}</span> : null}
			</div>
		</article>
	);
}
