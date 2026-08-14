import {
	type Category,
	type CreateCategoryInput,
	type CreateTaskInput,
	type SprintTasksResponse,
	type Task,
	type UpdateCategoryInput,
	type UpdateTaskInput,
	apiErrorSchema,
	categoriesResponseSchema,
	categorySchema,
	sessionSchema,
	sprintTasksResponseSchema,
	taskSchema
} from "@em-todo/shared";
import type { ZodType } from "zod";

export class ApiRequestError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly code: string
	) {
		super(message);
		this.name = "ApiRequestError";
	}
}

export async function getSession(signal?: AbortSignal): Promise<boolean> {
	const data = await request("/api/auth/session", sessionSchema, { signal });
	return data.authenticated;
}

export async function login(password: string): Promise<boolean> {
	const data = await request("/api/auth/login", sessionSchema, {
		method: "POST",
		body: JSON.stringify({ password })
	});
	return data.authenticated;
}

export async function logout(): Promise<void> {
	await request("/api/auth/logout", sessionSchema, { method: "POST" });
}

export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
	const data = await request("/api/categories", categoriesResponseSchema, { signal });
	return data.categories;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
	return request("/api/categories", categorySchema, {
		method: "POST",
		body: JSON.stringify(input)
	});
}

export async function updateCategory(categoryId: string, input: UpdateCategoryInput): Promise<Category> {
	return request(`/api/categories/${encodeURIComponent(categoryId)}`, categorySchema, {
		method: "PATCH",
		body: JSON.stringify(input)
	});
}

export async function getSprintTasks(sprintStart: string, signal?: AbortSignal): Promise<SprintTasksResponse> {
	return request(`/api/tasks?sprintStart=${encodeURIComponent(sprintStart)}`, sprintTasksResponseSchema, { signal });
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
	return request("/api/tasks", taskSchema, {
		method: "POST",
		body: JSON.stringify(input)
	});
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
	return request(`/api/tasks/${encodeURIComponent(taskId)}`, taskSchema, {
		method: "PATCH",
		body: JSON.stringify(input)
	});
}

export async function deleteTask(taskId: string): Promise<void> {
	const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
		method: "DELETE",
		credentials: "same-origin",
		headers: { "x-em-todo-request": "web" }
	});
	if (!response.ok) throw await parseError(response);
}

async function request<T>(path: string, schema: ZodType<T>, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers);
	if (init.body) headers.set("content-type", "application/json");
	if (init.method && !["GET", "HEAD"].includes(init.method)) {
		headers.set("x-em-todo-request", "web");
	}

	const response = await fetch(path, {
		...init,
		credentials: "same-origin",
		headers
	});
	if (!response.ok) throw await parseError(response);
	return schema.parse(await response.json());
}

async function parseError(response: Response): Promise<ApiRequestError> {
	const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
	return new ApiRequestError(parsed.success ? parsed.data.error.message : "連線發生問題，請稍後再試", response.status, parsed.success ? parsed.data.error.code : "UNKNOWN_ERROR");
}
