import { sessionSchema } from "@em-todo/shared";

import { apiRequest } from "@/shared/services/api-client.js";

export async function getSession(signal?: AbortSignal): Promise<boolean> {
	const data = await apiRequest("/api/auth/session", sessionSchema, { signal });
	return data.authenticated;
}

export async function login(password: string): Promise<boolean> {
	const data = await apiRequest("/api/auth/login", sessionSchema, { method: "POST", body: JSON.stringify({ password }) });
	return data.authenticated;
}

export async function logout(): Promise<void> {
	await apiRequest("/api/auth/logout", sessionSchema, { method: "POST" });
}
