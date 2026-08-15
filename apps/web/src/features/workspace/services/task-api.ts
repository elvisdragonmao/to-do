import { type CreateTaskInput, type UpdateTaskInput, sprintTasksResponseSchema, taskListResponseSchema, taskSchema } from "@em-todo/shared";

import { apiRequest, apiRequestVoid } from "@/shared/services/api-client.js";

export function getSprintTasks(sprintStart: string, signal?: AbortSignal) {
	return apiRequest(`/api/tasks?sprintStart=${encodeURIComponent(sprintStart)}`, sprintTasksResponseSchema, { signal });
}

export function getBacklogTasks(signal?: AbortSignal) {
	return apiRequest("/api/tasks/backlog", taskListResponseSchema, { signal });
}

export function getAllTasks(signal?: AbortSignal) {
	return apiRequest("/api/tasks/all", taskListResponseSchema, { signal });
}

export function createTask(input: CreateTaskInput) {
	return apiRequest("/api/tasks", taskSchema, { method: "POST", body: JSON.stringify(input) });
}

export function updateTask(taskId: string, input: UpdateTaskInput) {
	return apiRequest(`/api/tasks/${encodeURIComponent(taskId)}`, taskSchema, { method: "PATCH", body: JSON.stringify(input) });
}

export function deleteTask(taskId: string) {
	return apiRequestVoid(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
}
