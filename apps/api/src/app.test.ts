import { addDays, startOfSprint } from "@em-todo/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "./app.js";

describe("EM's To Do API", () => {
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
			headers: { cookie, "x-em-todo-request": "web" },
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
			headers: { cookie, "x-em-todo-request": "web" },
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
			headers: { cookie, "x-em-todo-request": "web" },
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
			headers: { cookie, "x-em-todo-request": "web" },
			payload: { version: 3, status: "DONE" }
		});
		expect(completed.json().completedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

		const reopened = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${created.json().id}`,
			headers: { cookie, "x-em-todo-request": "web" },
			payload: { version: 4, status: "DOING" }
		});
		expect(reopened.json().completedDate).toBeNull();
	});

	it("updates a category color", async () => {
		const created = await app.inject({
			method: "POST",
			url: "/api/categories",
			headers: { cookie, "x-em-todo-request": "web" },
			payload: { name: "Study", color: "#DD8406" }
		});

		const updated = await app.inject({
			method: "PATCH",
			url: `/api/categories/${created.json().id}`,
			headers: { cookie, "x-em-todo-request": "web" },
			payload: { color: "#DC5002" }
		});

		expect(updated.statusCode).toBe(200);
		expect(updated.json()).toMatchObject({ name: "Study", color: "#DC5002" });
	});

	it("separates unassigned backlog tasks from sprint and all-task lists", async () => {
		const categories = await app.inject({
			method: "GET",
			url: "/api/categories",
			headers: { cookie }
		});
		const categoryId = categories.json().categories[0].id as string;
		const firstSprint = startOfSprint("2026-08-10");
		const secondSprint = addDays(firstSprint, 7);
		const create = (title: string, sprintStart: string, status: "TODO" | "DOING" | "DONE", isBacklog = false) =>
			app.inject({
				method: "POST",
				url: "/api/tasks",
				headers: { cookie, "x-em-todo-request": "web" },
				payload: {
					title,
					description: "",
					sprintStart,
					scheduledDate: null,
					categoryId,
					urgency: 2,
					estimatedHours: null,
					dueDate: null,
					status,
					isBacklog
				}
			});

		await Promise.all([create("Backlog", firstSprint, "TODO", true), create("Scheduled", firstSprint, "TODO"), create("Completed", secondSprint, "DONE")]);
		const backlog = await app.inject({
			method: "GET",
			url: "/api/tasks/backlog",
			headers: { cookie }
		});

		expect(backlog.statusCode).toBe(200);
		expect(backlog.json().tasks.map((task: { title: string }) => task.title)).toEqual(["Backlog"]);

		const sprint = await app.inject({
			method: "GET",
			url: `/api/tasks?sprintStart=${firstSprint}`,
			headers: { cookie }
		});
		expect(sprint.json().tasks.map((task: { title: string }) => task.title)).toEqual(["Scheduled"]);

		const all = await app.inject({ method: "GET", url: "/api/tasks/all", headers: { cookie } });
		expect(
			all
				.json()
				.tasks.map((task: { title: string }) => task.title)
				.toSorted()
		).toEqual(["Backlog", "Completed", "Scheduled"]);
	});

	it("returns a conflict for duplicate category names", async () => {
		const request = () =>
			app.inject({
				method: "POST",
				url: "/api/categories",
				headers: { cookie, "x-em-todo-request": "web" },
				payload: { name: "Study", color: "#DD8406" }
			});
		expect((await request()).statusCode).toBe(201);
		const duplicate = await request();
		expect(duplicate.statusCode).toBe(409);
		expect(duplicate.json().error.code).toBe("ALREADY_EXISTS");
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
			headers: { cookie, "x-em-todo-request": "web" },
			payload
		});
		const stale = await app.inject({
			method: "PATCH",
			url: `/api/tasks/${created.json().id}`,
			headers: { cookie, "x-em-todo-request": "web" },
			payload: { version: 999, title: "不應覆寫" }
		});
		expect(stale.statusCode).toBe(409);
	});
});
