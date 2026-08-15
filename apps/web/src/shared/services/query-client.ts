import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			gcTime: 1000 * 60 * 60 * 24 * 7,
			networkMode: "offlineFirst",
			retry: (failureCount, error) => (error instanceof Error && "status" in error && Number(error.status) < 500 ? false : failureCount < 2),
			refetchOnWindowFocus: true
		},
		mutations: { gcTime: 1000 * 60 * 60 * 24 * 7, networkMode: "online", retry: 3 }
	}
});

export const persister = createSyncStoragePersister({ storage: window.localStorage, key: "em-to-do-query-cache-v1", throttleTime: 500 });

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
