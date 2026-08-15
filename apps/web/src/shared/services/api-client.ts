import { apiErrorSchema } from "@em-todo/shared";
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

export async function apiRequest<T>(path: string, schema: ZodType<T>, init: RequestInit = {}): Promise<T> {
	const response = await fetchApi(path, init);
	return schema.parse(await response.json());
}

export async function apiRequestVoid(path: string, init: RequestInit = {}): Promise<void> {
	await fetchApi(path, init);
}

async function fetchApi(path: string, init: RequestInit): Promise<Response> {
	const headers = new Headers(init.headers);
	if (init.body) headers.set("content-type", "application/json");
	if (init.method && !["GET", "HEAD"].includes(init.method)) headers.set("x-em-todo-request", "web");
	const response = await fetch(path, { ...init, credentials: "same-origin", headers });
	if (!response.ok) throw await parseError(response);
	return response;
}

async function parseError(response: Response): Promise<ApiRequestError> {
	const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
	return new ApiRequestError(parsed.success ? parsed.data.error.message : "連線發生問題，請稍後再試", response.status, parsed.success ? parsed.data.error.code : "UNKNOWN_ERROR");
}
