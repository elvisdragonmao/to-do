import { queryOptions } from "@tanstack/react-query";

import { getSession } from "./auth-api.js";

export const sessionQueryKey = ["session"] as const;

export const sessionQuery = () =>
	queryOptions({
		queryKey: sessionQueryKey,
		queryFn: ({ signal }) => getSession(signal),
		staleTime: 30_000,
		retry: false
	});
