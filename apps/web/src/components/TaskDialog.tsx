import { type Category, type CreateTaskInput, type Task, type UpdateTaskInput, createTaskSchema, startOfSprint, updateTaskSchema } from "@sprintly/shared";
import { useEffect, useState, type FormEvent } from "react";

import { Spinner } from "./Spinner.js";
import { AppDialog } from "./AppDialog.js";

type Values = {
	title: string;
	description: string;
	sprintStart: string;
	scheduledDate: string;
	initialPlannedDate: string;
	lastPlannedDate: string;
	categoryId: string;
	urgency: string;
	estimatedHours: string;
	dueDate: string;
	status: Task["status"];
};

export function TaskDialog({
	categories,
	defaultSprintStart,
	onClose,
	onCreate,
	onDelete,
	onUpdate,
	open,
	pending,
	task
}: {
	categories: Category[];
	defaultSprintStart: string;
	onClose: () => void;
	onCreate: (input: CreateTaskInput) => void;
	onDelete: (task: Task) => void;
	onUpdate: (taskId: string, input: UpdateTaskInput) => void;
	open: boolean;
	pending: boolean;
	task: Task | null;
}) {
	const [values, setValues] = useState<Values>(() => initialValues(task, defaultSprintStart, categories));
	const [error, setError] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);

	useEffect(() => {
		if (open) {
			setValues(initialValues(task, defaultSprintStart, categories));
			setError(null);
			setConfirmDelete(false);
		}
	}, [open, task, defaultSprintStart, categories]);

	const set = <Key extends keyof Values>(key: Key, value: Values[Key]) => setValues(current => ({ ...current, [key]: value }));

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const common = {
			title: values.title,
			description: values.description,
			sprintStart: values.sprintStart,
			scheduledDate: values.scheduledDate || null,
			categoryId: values.categoryId,
			urgency: Number(values.urgency),
			estimatedHours: values.estimatedHours === "" ? null : Number(values.estimatedHours),
			dueDate: values.dueDate || null,
			status: values.status
		};

		if (task) {
			const parsed = updateTaskSchema.safeParse({
				...common,
				version: task.version,
				initialPlannedDate: values.initialPlannedDate,
				lastPlannedDate: values.lastPlannedDate
			});
			if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "請檢查輸入內容");
			onUpdate(task.id, parsed.data);
		} else {
			const parsed = createTaskSchema.safeParse(common);
			if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "請檢查輸入內容");
			onCreate(parsed.data);
		}
	};

	return (
		<AppDialog
			description={task ? "所有日期都能手動修正；移動項目時系統仍會保留排程歷史。" : "先快速建立，細節隨時可以補上。"}
			onOpenChange={next => (next ? undefined : onClose())}
			open={open}
			title={task ? "編輯項目" : "新增到 sprint"}
			wide
		>
			<form className="task-form" onSubmit={submit}>
				<div className="form-grid form-grid--full">
					<label className="field">
						<span>標題 *</span>
						<input autoFocus disabled={pending} maxLength={160} onChange={event => set("title", event.target.value)} placeholder="下一個具體行動是什麼？" required value={values.title} />
					</label>
					<label className="field">
						<span>描述或網址</span>
						<textarea
							disabled={pending}
							maxLength={4000}
							onChange={event => set("description", event.target.value)}
							placeholder="補充脈絡，貼上 https://… 會變成可點擊連結"
							rows={3}
							value={values.description}
						/>
					</label>
				</div>

				<div className="form-grid">
					<label className="field">
						<span>Sprint（星期一）</span>
						<input
							disabled={pending}
							onChange={event => {
								const selected = event.target.value;
								setValues(current => ({
									...current,
									sprintStart: selected ? startOfSprint(selected) : "",
									scheduledDate: selected && current.scheduledDate && startOfSprint(current.scheduledDate) === startOfSprint(selected) ? current.scheduledDate : ""
								}));
							}}
							required
							type="date"
							value={values.sprintStart}
						/>
					</label>
					<label className="field">
						<span>指定星期幾</span>
						<input
							disabled={pending}
							max={values.sprintStart ? offsetDate(values.sprintStart, 6) : undefined}
							min={values.sprintStart}
							onChange={event => set("scheduledDate", event.target.value)}
							type="date"
							value={values.scheduledDate}
						/>
						<small>留白表示只排進整個 sprint</small>
					</label>
					<label className="field">
						<span>分類 *</span>
						<select disabled={pending} onChange={event => set("categoryId", event.target.value)} required value={values.categoryId}>
							{categories.map(category => (
								<option key={category.id} value={category.id}>
									{category.name}
								</option>
							))}
						</select>
					</label>
					<label className="field">
						<span>狀態</span>
						<select disabled={pending} onChange={event => set("status", event.target.value as Task["status"])} value={values.status}>
							<option value="TODO">待處理</option>
							<option value="DOING">進行中</option>
							<option value="DONE">完成</option>
						</select>
					</label>
					<label className="field">
						<span>緊急程度</span>
						<select disabled={pending} onChange={event => set("urgency", event.target.value)} value={values.urgency}>
							<option value="1">1 · 不急</option>
							<option value="2">2 · 一般</option>
							<option value="3">3 · 緊急</option>
							<option value="4">4 · 立刻處理</option>
						</select>
					</label>
					<label className="field">
						<span>預計花費（小時）</span>
						<input
							disabled={pending}
							inputMode="decimal"
							min="0"
							onChange={event => set("estimatedHours", event.target.value)}
							placeholder="例如 1.5"
							step="0.25"
							type="number"
							value={values.estimatedHours}
						/>
					</label>
					<label className="field">
						<span>Due date</span>
						<input disabled={pending} onChange={event => set("dueDate", event.target.value)} type="date" value={values.dueDate} />
					</label>
				</div>

				{task ? (
					<fieldset className="history-fields">
						<legend>排程歷史</legend>
						<label className="field">
							<span>預計日期（第一次排程）</span>
							<input disabled={pending} onChange={event => set("initialPlannedDate", event.target.value)} required type="date" value={values.initialPlannedDate} />
						</label>
						<label className="field">
							<span>最後預計日期</span>
							<input disabled={pending} onChange={event => set("lastPlannedDate", event.target.value)} required type="date" value={values.lastPlannedDate} />
						</label>
					</fieldset>
				) : null}

				{error ? (
					<p className="field-error" role="alert">
						{error}
					</p>
				) : null}

				<footer className="dialog-actions">
					{task ? (
						<button
							className={`button ${confirmDelete ? "button--danger" : "button--text-danger"}`}
							disabled={pending}
							onClick={() => {
								if (confirmDelete) onDelete(task);
								else setConfirmDelete(true);
							}}
							type="button"
						>
							{confirmDelete ? "再按一次確認刪除" : "刪除"}
						</button>
					) : (
						<span />
					)}
					<div className="dialog-actions__primary">
						<button className="button button--text" disabled={pending} onClick={onClose} type="button">
							取消
						</button>
						<button className="button button--filled" disabled={pending || !values.title.trim()}>
							{pending ? <Spinner label="正在同步" size="small" /> : null}
							{pending ? "同步中" : task ? "儲存變更" : "建立項目"}
						</button>
					</div>
				</footer>
			</form>
		</AppDialog>
	);
}

function initialValues(task: Task | null, sprintStart: string, categories: Category[]): Values {
	return task
		? {
				title: task.title,
				description: task.description,
				sprintStart: task.sprintStart,
				scheduledDate: task.scheduledDate ?? "",
				initialPlannedDate: task.initialPlannedDate,
				lastPlannedDate: task.lastPlannedDate,
				categoryId: task.categoryId,
				urgency: String(task.urgency),
				estimatedHours: task.estimatedHours === null ? "" : String(task.estimatedHours),
				dueDate: task.dueDate ?? "",
				status: task.status
			}
		: {
				title: "",
				description: "",
				sprintStart,
				scheduledDate: "",
				initialPlannedDate: sprintStart,
				lastPlannedDate: sprintStart,
				categoryId: categories[0]?.id ?? "uncategorized",
				urgency: "2",
				estimatedHours: "",
				dueDate: "",
				status: "TODO"
			};
}

function offsetDate(date: string, amount: number): string {
	const parsed = new Date(`${date}T12:00:00Z`);
	parsed.setUTCDate(parsed.getUTCDate() + amount);
	return parsed.toISOString().slice(0, 10);
}
