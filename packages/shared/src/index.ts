import { z } from "zod";

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isoDateSchema = z
	.string()
	.regex(ISO_DATE_PATTERN, "請使用 YYYY-MM-DD 日期格式")
	.refine(value => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "日期無效");

export const taskStatusSchema = z.enum(["TODO", "DOING", "DONE"]);
export const urgencySchema = z.number().int().min(1).max(4);

export const categorySchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1).max(40),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
	isDefault: z.boolean(),
	createdAt: z.string(),
	sortOrder: z.number()
});

export const taskSchema = z.object({
	id: z.string().min(1),
	title: z.string().trim().min(1).max(160),
	description: z.string().max(4000),
	createdAt: z.string(),
	updatedAt: z.string(),
	sprintStart: isoDateSchema,
	scheduledDate: isoDateSchema.nullable(),
	initialPlannedDate: isoDateSchema,
	lastPlannedDate: isoDateSchema,
	categoryId: z.string().min(1),
	urgency: urgencySchema,
	estimatedHours: z.number().min(0).max(10000).nullable(),
	dueDate: isoDateSchema.nullable(),
	status: taskStatusSchema,
	sortOrder: z.number(),
	version: z.number().int().positive()
});

export const taskPlacementSchema = z
	.object({
		sprintStart: isoDateSchema,
		scheduledDate: isoDateSchema.nullable()
	})
	.superRefine(({ sprintStart, scheduledDate }, context) => {
		if (scheduledDate && startOfSprint(scheduledDate) !== sprintStart) {
			context.addIssue({
				code: "custom",
				message: "指定日期必須位於選擇的 sprint 內",
				path: ["scheduledDate"]
			});
		}
	});

export const createTaskSchema = z
	.object({
		title: z.string().trim().min(1, "請輸入標題").max(160),
		description: z.string().trim().max(4000).default(""),
		sprintStart: isoDateSchema,
		scheduledDate: isoDateSchema.nullable().default(null),
		categoryId: z.string().min(1),
		urgency: urgencySchema.default(2),
		estimatedHours: z.number().min(0).max(10000).nullable().default(null),
		dueDate: isoDateSchema.nullable().default(null),
		status: taskStatusSchema.default("TODO")
	})
	.superRefine(({ sprintStart, scheduledDate }, context) => {
		if (scheduledDate && startOfSprint(scheduledDate) !== sprintStart) {
			context.addIssue({
				code: "custom",
				message: "指定日期必須位於選擇的 sprint 內",
				path: ["scheduledDate"]
			});
		}
	});

export const updateTaskSchema = z
	.object({
		title: z.string().trim().min(1).max(160).optional(),
		description: z.string().trim().max(4000).optional(),
		sprintStart: isoDateSchema.optional(),
		scheduledDate: isoDateSchema.nullable().optional(),
		initialPlannedDate: isoDateSchema.optional(),
		lastPlannedDate: isoDateSchema.optional(),
		categoryId: z.string().min(1).optional(),
		urgency: urgencySchema.optional(),
		estimatedHours: z.number().min(0).max(10000).nullable().optional(),
		dueDate: isoDateSchema.nullable().optional(),
		status: taskStatusSchema.optional(),
		sortOrder: z.number().optional(),
		version: z.number().int().positive()
	})
	.refine(value => Object.keys(value).length > 1, "沒有可更新的欄位");

export const createCategorySchema = z.object({
	name: z.string().trim().min(1, "請輸入分類名稱").max(40),
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export const updateCategorySchema = z.object({
	color: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export const loginRequestSchema = z.object({
	password: z.string().min(1, "請輸入密碼").max(512)
});

export const sessionSchema = z.object({ authenticated: z.boolean() });

export const apiErrorSchema = z.object({
	error: z.object({
		code: z.string(),
		message: z.string(),
		details: z.unknown().optional()
	})
});

export const sprintTasksResponseSchema = z.object({
	sprintStart: isoDateSchema,
	tasks: z.array(taskSchema)
});

export const categoriesResponseSchema = z.object({
	categories: z.array(categorySchema)
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type SprintTasksResponse = z.infer<typeof sprintTasksResponseSchema>;
export type Task = z.infer<typeof taskSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export function startOfSprint(value: Date | string): string {
	const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00Z`) : new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), 12));
	const day = date.getUTCDay();
	const difference = day === 0 ? -6 : 1 - day;
	date.setUTCDate(date.getUTCDate() + difference);
	return formatIsoDate(date);
}

export function addDays(value: string, days: number): string {
	const date = new Date(`${value}T12:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return formatIsoDate(date);
}

export function sprintDays(sprintStart: string): string[] {
	return Array.from({ length: 7 }, (_, index) => addDays(sprintStart, index));
}

export function resolvePlacementHistory(
	task: Pick<Task, "initialPlannedDate" | "sprintStart">,
	nextSprintStart: string,
	nextScheduledDate: string | null
): Pick<Task, "initialPlannedDate" | "lastPlannedDate"> {
	const target = nextScheduledDate ?? nextSprintStart;
	const canRefineInitialSprint = task.initialPlannedDate === task.sprintStart && nextSprintStart === task.sprintStart && nextScheduledDate !== null;

	return {
		initialPlannedDate: canRefineInitialSprint ? nextScheduledDate : task.initialPlannedDate,
		lastPlannedDate: target
	};
}

function formatIsoDate(date: Date): string {
	return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");
}
