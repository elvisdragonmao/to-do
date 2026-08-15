import { queryOptions } from "@tanstack/react-query";

import { getCategories } from "./category-api.js";

export const categoryQueryKeys = {
	all: ["categories"] as const
};

export const categoryMutationKeys = {
	create: ["categories", "create"] as const,
	update: ["categories", "update"] as const
};

export const categoriesQuery = () =>
	queryOptions({
		queryKey: categoryQueryKeys.all,
		queryFn: ({ signal }) => getCategories(signal),
		staleTime: 5 * 60 * 1000
	});
