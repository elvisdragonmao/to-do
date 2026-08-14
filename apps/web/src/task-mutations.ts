import { type CreateTaskInput, type SprintTasksResponse, type Task, type UpdateTaskInput, resolvePlacementHistory } from "@sprintly/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTask, deleteTask, updateTask } from "./api.js";
import { useToast } from "./components/Toast.js";
import { mutationKeys, queryKeys, type TaskCacheSnapshot } from "./queries.js";

export function useTaskMutations() {
	const client = useQueryClient();
	const toast = useToast();

	const create = useMutation({
		mutationKey: mutationKeys.createTask,
		mutationFn: ({ input }: { input: CreateTaskInput; optimisticId: string }) => createTask(input),
		onMutate: async ({ input, optimisticId }) => {
			await client.cancelQueries({ queryKey: queryKeys.tasks.all });
			const snapshot = getSnapshot(client);
			const now = new Date().toISOString();
			const optimistic: Task = {
				...input,
				id: optimisticId,
				createdAt: now,
				updatedAt: now,
				initialPlannedDate: input.scheduledDate ?? input.sprintStart,
				lastPlannedDate: input.scheduledDate ?? input.sprintStart,
				completedDate: input.status === "DONE" ? currentIsoDate() : null,
				sortOrder: Date.now(),
				version: 1
			};
			client.setQueryData<SprintTasksResponse>(queryKeys.tasks.sprint(input.sprintStart), old => ({
				sprintStart: input.sprintStart,
				tasks: [...(old?.tasks ?? []), optimistic]
			}));
			return { snapshot };
		},
		onError: (error, _variables, context) => {
			restoreSnapshot(client, context?.snapshot);
			toast.show(messageFrom(error), "error");
		},
		onSuccess: (task, variables) => {
			replaceTask(client, variables.optimisticId, task);
			toast.show("項目已同步");
		},
		onSettled: (_data, _error, variables) => client.invalidateQueries({ queryKey: queryKeys.tasks.sprint(variables.input.sprintStart) })
	});

	const update = useMutation({
		mutationKey: mutationKeys.updateTask,
		mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) => updateTask(taskId, input),
		onMutate: async ({ taskId, input }) => {
			await client.cancelQueries({ queryKey: queryKeys.tasks.all });
			const snapshot = getSnapshot(client);
			const current = findTask(snapshot, taskId);
			if (!current) return { snapshot };

			const sprintStart = input.sprintStart ?? current.sprintStart;
			const scheduledDate = input.scheduledDate === undefined ? current.scheduledDate : input.scheduledDate;
			const placementChanged = sprintStart !== current.sprintStart || scheduledDate !== current.scheduledDate;
			const nextStatus = input.status ?? current.status;
			const completedDate =
				input.completedDate !== undefined
					? input.completedDate
					: current.status !== "DONE" && nextStatus === "DONE"
						? currentIsoDate()
						: current.status === "DONE" && nextStatus !== "DONE"
							? null
							: current.completedDate;
			const history = placementChanged
				? resolvePlacementHistory(current, sprintStart, scheduledDate)
				: {
						initialPlannedDate: current.initialPlannedDate,
						lastPlannedDate: current.lastPlannedDate
					};
			const optimistic: Task = {
				...current,
				...input,
				sprintStart,
				scheduledDate,
				initialPlannedDate: input.initialPlannedDate ?? history.initialPlannedDate,
				lastPlannedDate: input.lastPlannedDate ?? history.lastPlannedDate,
				completedDate,
				updatedAt: new Date().toISOString(),
				version: current.version + 1
			};
			removeTask(client, taskId);
			client.setQueryData<SprintTasksResponse>(queryKeys.tasks.sprint(sprintStart), old => ({
				sprintStart,
				tasks: [...(old?.tasks ?? []), optimistic]
			}));
			return { snapshot, oldSprint: current.sprintStart, newSprint: sprintStart };
		},
		onError: (error, _variables, context) => {
			restoreSnapshot(client, context?.snapshot);
			toast.show(messageFrom(error), "error");
		},
		onSuccess: task => replaceTask(client, task.id, task),
		onSettled: (_data, _error, _variables, context) =>
			Promise.all([...new Set([context?.oldSprint, context?.newSprint].filter(Boolean))].map(sprint => client.invalidateQueries({ queryKey: queryKeys.tasks.sprint(sprint!) })))
	});

	const remove = useMutation({
		mutationKey: mutationKeys.deleteTask,
		mutationFn: ({ taskId }: { taskId: string }) => deleteTask(taskId),
		onMutate: async ({ taskId }) => {
			await client.cancelQueries({ queryKey: queryKeys.tasks.all });
			const snapshot = getSnapshot(client);
			const sprintStart = findTask(snapshot, taskId)?.sprintStart;
			removeTask(client, taskId);
			return { snapshot, sprintStart };
		},
		onError: (error, _variables, context) => {
			restoreSnapshot(client, context?.snapshot);
			toast.show(messageFrom(error), "error");
		},
		onSuccess: () => toast.show("項目已刪除"),
		onSettled: (_data, _error, _variables, context) => (context?.sprintStart ? client.invalidateQueries({ queryKey: queryKeys.tasks.sprint(context.sprintStart) }) : undefined)
	});

	return { create, update, remove };
}

function getSnapshot(client: ReturnType<typeof useQueryClient>): TaskCacheSnapshot {
	return client.getQueriesData<SprintTasksResponse>({ queryKey: queryKeys.tasks.all });
}

function restoreSnapshot(client: ReturnType<typeof useQueryClient>, snapshot: TaskCacheSnapshot | undefined) {
	snapshot?.forEach(([key, value]) => client.setQueryData(key, value));
}

function findTask(snapshot: TaskCacheSnapshot, id: string): Task | undefined {
	for (const [, data] of snapshot) {
		const task = data?.tasks.find(candidate => candidate.id === id);
		if (task) return task;
	}
}

function removeTask(client: ReturnType<typeof useQueryClient>, id: string) {
	client.setQueriesData<SprintTasksResponse>({ queryKey: queryKeys.tasks.all }, old => (old ? { ...old, tasks: old.tasks.filter(task => task.id !== id) } : old));
}

function replaceTask(client: ReturnType<typeof useQueryClient>, id: string, task: Task) {
	removeTask(client, id);
	client.setQueryData<SprintTasksResponse>(queryKeys.tasks.sprint(task.sprintStart), old => ({
		sprintStart: task.sprintStart,
		tasks: [...(old?.tasks ?? []).filter(candidate => candidate.id !== task.id), task]
	}));
}

function messageFrom(error: unknown): string {
	return error instanceof Error ? error.message : "無法同步變更，已恢復原狀";
}

function currentIsoDate(now = new Date()): string {
	const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
	return local.toISOString().slice(0, 10);
}
