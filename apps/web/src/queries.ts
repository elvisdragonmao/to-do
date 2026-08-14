import type { TaskListResponse } from "@em-todo/shared";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient, queryOptions } from "@tanstack/react-query";

import { createTask, deleteTask, getBacklogTasks, getCategories, getSprintTasks, updateTask } from "./api.js";

export const queryKeys = {
	session: ["session"] as const,
	categories: ["categories"] as const,
	tasks: {
		all: ["tasks"] as const,
		backlog: ["tasks", "backlog"] as const,
		sprint: (sprintStart: string) => ["tasks", "sprint", sprintStart] as const
	}
};

export const mutationKeys = {
	createTask: ["tasks", "create"] as const,
	updateTask: ["tasks", "update"] as const,
	deleteTask: ["tasks", "delete"] as const,
	createCategory: ["categories", "create"] as const,
	updateCategory: ["categories", "update"] as const
};

export const categoriesQuery = () =>
	queryOptions({
		queryKey: queryKeys.categories,
		queryFn: ({ signal }) => getCategories(signal),
		staleTime: 5 * 60 * 1000
	});

export const sprintTasksQuery = (sprintStart: string) =>
	queryOptions({
		queryKey: queryKeys.tasks.sprint(sprintStart),
		queryFn: ({ signal }) => getSprintTasks(sprintStart, signal),
		staleTime: 30 * 1000
	});

export const backlogTasksQuery = () =>
	queryOptions({
		queryKey: queryKeys.tasks.backlog,
		queryFn: ({ signal }) => getBacklogTasks(signal),
		staleTime: 30 * 1000
	});

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24 * 7,
			networkMode: "offlineFirst",
			retry: (failureCount, error) => (error instanceof Error && "status" in error && Number(error.status) < 500 ? false : failureCount < 2),
			refetchOnWindowFocus: true
		},
		mutations: {
			gcTime: 1000 * 60 * 60 * 24 * 7,
			networkMode: "online",
			retry: 3
		}
	}
});

queryClient.setMutationDefaults(mutationKeys.createTask, {
	mutationFn: ({ input }: { input: Parameters<typeof createTask>[0]; optimisticId: string }) => createTask(input),
	onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
});
queryClient.setMutationDefaults(mutationKeys.updateTask, {
	mutationFn: ({ taskId, input }: { taskId: string; input: Parameters<typeof updateTask>[1] }) => updateTask(taskId, input),
	onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
});
queryClient.setMutationDefaults(mutationKeys.deleteTask, {
	mutationFn: ({ taskId }: { taskId: string }) => deleteTask(taskId),
	onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
});

export const persister = createSyncStoragePersister({
	storage: window.localStorage,
	key: "em-to-do-query-cache-v1",
	throttleTime: 500
});

export const persistOptions = {
	persister,
	maxAge: 1000 * 60 * 60 * 24 * 7,
	buster: "em-to-do-v2",
	dehydrateOptions: {
		shouldDehydrateQuery: (query: { queryKey: readonly unknown[]; state: { status: string } }) =>
			query.state.status === "success" && (query.queryKey[0] === "tasks" || query.queryKey[0] === "categories" || query.queryKey[0] === "session"),
		shouldDehydrateMutation: (mutation: { state: { isPaused: boolean } }) => mutation.state.isPaused
	}
};

export type TaskCacheSnapshot = [readonly unknown[], TaskListResponse | undefined][];
