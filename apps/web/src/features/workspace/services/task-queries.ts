import type { TaskListResponse } from "@em-todo/shared";
import { queryOptions } from "@tanstack/react-query";

import { queryClient } from "../../../shared/services/query-client.js";
import { createTask, deleteTask, getAllTasks, getBacklogTasks, getSprintTasks, updateTask } from "./task-api.js";

export const taskQueryKeys = {
	all: ["tasks"] as const,
	allList: ["tasks", "all"] as const,
	backlog: ["tasks", "backlog"] as const,
	sprint: (sprintStart: string) => ["tasks", "sprint", sprintStart] as const
};

export const taskMutationKeys = {
	create: ["tasks", "create"] as const,
	update: ["tasks", "update"] as const,
	delete: ["tasks", "delete"] as const
};

export const sprintTasksQuery = (sprintStart: string) => queryOptions({ queryKey: taskQueryKeys.sprint(sprintStart), queryFn: ({ signal }) => getSprintTasks(sprintStart, signal), staleTime: 30_000 });

export const backlogTasksQuery = () => queryOptions({ queryKey: taskQueryKeys.backlog, queryFn: ({ signal }) => getBacklogTasks(signal), staleTime: 30_000 });

export const allTasksQuery = () => queryOptions({ queryKey: taskQueryKeys.allList, queryFn: ({ signal }) => getAllTasks(signal), staleTime: 30_000 });

queryClient.setMutationDefaults(taskMutationKeys.create, {
	mutationFn: ({ input }: { input: Parameters<typeof createTask>[0]; optimisticId: string }) => createTask(input),
	onSettled: () => queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
});
queryClient.setMutationDefaults(taskMutationKeys.update, {
	mutationFn: ({ taskId, input }: { taskId: string; input: Parameters<typeof updateTask>[1] }) => updateTask(taskId, input),
	onSettled: () => queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
});
queryClient.setMutationDefaults(taskMutationKeys.delete, {
	mutationFn: ({ taskId }: { taskId: string }) => deleteTask(taskId),
	onSettled: () => queryClient.invalidateQueries({ queryKey: taskQueryKeys.all })
});

export type TaskCacheSnapshot = [readonly unknown[], TaskListResponse | undefined][];
