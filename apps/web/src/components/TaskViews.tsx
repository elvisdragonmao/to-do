import { type Category, type Task, type TaskStatus, sprintDays } from "@sprintly/shared";
import { useDroppable } from "@dnd-kit/core";

import { formatDay, isToday } from "../date-format.js";
import { Icon } from "../icons.js";
import { TaskCard, type SyncState } from "./TaskCard.js";

type CommonProps = {
	categories: Map<string, Category>;
	onEdit: (task: Task) => void;
	onToggle: (task: Task) => void;
	syncStates: Map<string, SyncState>;
	tasks: Task[];
};

export function ListView({ sprintStart, ...props }: CommonProps & { sprintStart: string }) {
	const inbox = props.tasks.filter(task => task.scheduledDate === null);
	return (
		<div aria-label="Sprint 清單" className="list-view">
			<TaskGroup {...props} date={null} description="還沒指定星期幾" sprintStart={sprintStart} tasks={inbox} title="Sprint 收件匣" />
			{sprintDays(sprintStart).map(date => {
				const formatted = formatDay(date);
				return (
					<TaskGroup
						{...props}
						date={date}
						description={formatted.date}
						key={date}
						sprintStart={sprintStart}
						tasks={props.tasks.filter(task => task.scheduledDate === date)}
						title={`${formatted.weekday}${isToday(date) ? " · 今天" : ""}`}
					/>
				);
			})}
		</div>
	);
}

export function KanbanView(props: CommonProps) {
	const columns: { status: TaskStatus; title: string; hint: string }[] = [
		{ status: "TODO", title: "待處理", hint: "準備開始" },
		{ status: "DOING", title: "進行中", hint: "保持專注" },
		{ status: "DONE", title: "完成", hint: "做得好" }
	];
	return (
		<div aria-label="Sprint Kanban" className="kanban-view">
			{columns.map(column => (
				<StatusColumn {...props} hint={column.hint} key={column.status} status={column.status} tasks={props.tasks.filter(task => task.status === column.status)} title={column.title} />
			))}
		</div>
	);
}

function TaskGroup({
	categories,
	date,
	description,
	onEdit,
	onToggle,
	sprintStart,
	syncStates,
	tasks,
	title
}: CommonProps & {
	date: string | null;
	description: string;
	sprintStart: string;
	title: string;
}) {
	const dropId = `place:${sprintStart}:${date ?? "inbox"}`;
	const { isOver, setNodeRef } = useDroppable({ id: dropId });
	return (
		<section className={`task-group${isOver ? " drop-target" : ""}`} ref={setNodeRef}>
			<header className="task-group__header">
				<div>
					<h2>{title}</h2>
					<span>{description}</span>
				</div>
				<span aria-label={`${tasks.length} 個項目`} className="count-badge">
					{tasks.length}
				</span>
			</header>
			<div className="task-stack">
				{tasks.length > 0 ? (
					tasks.map(task => <TaskCard category={categories.get(task.categoryId)} key={task.id} onEdit={onEdit} onToggle={onToggle} syncState={syncStates.get(task.id)} task={task} />)
				) : (
					<div className="empty-drop-zone">
						<Icon name="add" />
						拖到這裡
					</div>
				)}
			</div>
		</section>
	);
}

function StatusColumn({ categories, hint, onEdit, onToggle, status, syncStates, tasks, title }: CommonProps & { hint: string; status: TaskStatus; title: string }) {
	const { isOver, setNodeRef } = useDroppable({ id: `status:${status}` });
	return (
		<section className={`kanban-column${isOver ? " drop-target" : ""}`} ref={setNodeRef}>
			<header className="kanban-column__header">
				<div>
					<p>{hint}</p>
					<h2>{title}</h2>
				</div>
				<span className="count-badge">{tasks.length}</span>
			</header>
			<div className="task-stack">
				{tasks.map(task => (
					<TaskCard category={categories.get(task.categoryId)} key={task.id} onEdit={onEdit} onToggle={onToggle} syncState={syncStates.get(task.id)} task={task} />
				))}
				{tasks.length === 0 ? <div className="empty-column">拖曳項目到這裡</div> : null}
			</div>
		</section>
	);
}
