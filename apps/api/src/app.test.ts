import { addDays, startOfSprint } from "@sprintly/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "./app.js";

describe("Sprintly API", () => {
	let app: FastifyInstance;
	let cookie: string;

	beforeEach(async () => {
		app = await createApp({ databasePath: ":memory:", password: "correct horse" });
		const login = await app.inject({
			method: "POST",
			url: "/api/auth/login",
			payload: { password: "correct horse" }
		});
		cookie = login.cookies[0]?.name + "=" + login.cookies[0]?.value;
	});

	afterEach(async () => app.close());

	it("requires authentication and rejects incorrect passwords", async () => {
		const unauthenticated = await createApp({ databasePath: ":memory:", password: "secret" });
		const denied = await unauthenticated.inject({ method: "GET", url: "/api/categories" });
		const login = await unauthenticated.inject({
			method: "POST",
			url: "/api/auth/login",
			payload: { password: "wrong" }
		});
		expect(denied.statusCode).toBe(401);
		expect(login.statusCode).toBe(401);
		await unauthenticated.close();
	});

	it("creates and moves a task while preserving planning history", async () => {
		const sprintStart = startOfSprint("2026-08-13");
		const categories = await app.inject({
			method: "GET",
			url: "/api/categories",
			headers: { cookie }
		});
		const categoryId = categories.json().categories[0].id as string;

		const created = await app.inject({
			method: "POST",
			url: "/api/tasks",
			headers: { cookie, "x-sprintly-request": "web" },
			payload: {
				title: "完成 PWA",
				description: "https://web.dev/learn/pwa/",
				sprintStart,
				scheduledDate: null,
				categoryId,
				urgency: 4,
				estimatedHours: 2.5,
				dueDate: addDays(sprintStart, 4),
				status: "TODO"
			}
		});
		expect(created.statusCode).toBe(201);
		expect(created.json().initialPlannedDate).toBe(sprintStart);
		expect(created.json().completedDate).toBeNull();

		const placedDay = addDays(sprintStart, 2);
		const moved = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${created.json().id}`,
			headers: { cookie, "x-sprintly-request": "web" },
			payload: {
				version: 1,
				sprintStart,
				scheduledDate: placedDay
			}
		});
		expect(moved.statusCode).toBe(200);
		expect(moved.json().initialPlannedDate).toBe(placedDay);

		const nextSprint = addDays(sprintStart, 7);
		const movedAgain = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${created.json().id}`,
			headers: { cookie, "x-sprintly-request": "web" },
			payload: {
				version: 2,
				sprintStart: nextSprint,
				scheduledDate: addDays(nextSprint, 1)
			}
		});
		expect(movedAgain.json().initialPlannedDate).toBe(placedDay);
		expect(movedAgain.json().lastPlannedDate).toBe(addDays(nextSprint, 1));

		const completed = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${created.json().id}`,
			headers: { cookie, "x-sprintly-request": "web" },
			payload: { version: 3, status: "DONE" }
		});
		expect(completed.json().completedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

		const reopened = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${created.json().id}`,
			headers: { cookie, "x-sprintly-request": "web" },
			payload: { version: 4, status: "DOING" }
		});
		expect(reopened.json().completedDate).toBeNull();
	});

	it("updates a category color", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/api/categories",
			headers: { cookie, "x-sprintly-request": "web" },
			payload: { name: "Study", color: "#DD8406" }
		});

		const updated = await app.inject({
			method: "PATCH",
			url: `/api/categories/${created.json().id}`,
			headers: { cookie, "x-sprintly-request": "web" },
			payload: { color: "#DC5002" }
		});

		expect(updated.statusCode).toBe(200);
		expect(updated.json()).toMatchObject({ name: "Study", color: "#DC5002" });
	});

	it("rejects stale writes and untrusted mutations", async () => {
		const sprintStart = startOfSprint(new Date());
		const categories = await app.inject({
			method: "GET",
			url: "/api/categories",
			headers: { cookie }
		});
		const payload = {
			title: "衝突測試",
			description: "",
			sprintStart,
			scheduledDate: null,
			categoryId: categories.json().categories[0].id,
			urgency: 2,
			estimatedHours: null,
			dueDate: null,
			status: "TODO"
		};
		const untrusted = await app.inject({
			method: "POST",
			url: "/api/tasks",
			headers: { cookie },
			payload
		});
		expect(untrusted.statusCode).toBe(403);

		const created = await app.inject({
			method: "POST",
			url: "/api/tasks",
			headers: { cookie, "x-sprintly-request": "web" },
			payload
		});
		const stale = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${created.json().id}`,
			headers: { cookie, "x-sprintly-request": "web" },
			payload: { version: 999, title: "不應覆寫" }
		});
		expect(stale.statusCode).toBe(409);
	});
});
