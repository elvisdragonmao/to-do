import {
	apiErrorSchema,
	categoriesResponseSchema,
	categorySchema,
	createCategorySchema,
	createTaskSchema,
	isoDateSchema,
	loginRequestSchema,
	sessionSchema,
	sprintTasksResponseSchema,
	taskListResponseSchema,
	taskSchema,
	updateCategorySchema,
	updateTaskSchema
} from "@em-todo/shared";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z, ZodError, type ZodType } from "zod";

import { TodoDatabase } from "./database.js";

const SESSION_COOKIE = "em_todo_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

type AppOptions = {
	databasePath: string;
	password: string;
	serveWeb?: boolean;
	webRoot?: string;
	logger?: boolean;
	production?: boolean;
};

export async function createApp(options: AppOptions): Promise<FastifyInstance> {
	const app = Fastify({
		logger: options.logger ?? false,
		bodyLimit: 1024 * 1024
	});
	const database = new TodoDatabase(options.databasePath);
	await database.initializePassword(options.password);

	await app.register(cookie);
	await app.register(rateLimit, { global: false, max: 20, timeWindow: "1 minute" });

	app.addHook("onRequest", async (request, reply) => {
		if (!request.url.startsWith("/api/") || isPublicApiPath(request.url)) return;
		const token = request.cookies[SESSION_COOKIE];
		if (!token || !database.hasSession(token)) {
			return sendError(reply, 401, "UNAUTHENTICATED", "請先登入");
		}
		if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
			if (request.headers["x-em-todo-request"] !== "web") {
				return sendError(reply, 403, "INVALID_REQUEST_SOURCE", "無法驗證請求來源");
			}
		}
	});

	app.get("/healthz", async () => ({ status: "ok" }));

	app.get("/api/auth/session", async request => {
		const token = request.cookies[SESSION_COOKIE];
		return sessionSchema.parse({ authenticated: Boolean(token && database.hasSession(token)) });
	});

	app.post("/api/auth/login", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
		const input = parse(loginRequestSchema, request.body);
		if (!(await database.checkPassword(input.password))) {
			return sendError(reply, 401, "INVALID_PASSWORD", "密碼不正確");
		}

		const token = randomBytes(32).toString("base64url");
		const expires = new Date(Date.now() + SESSION_SECONDS * 1000);
		database.createSession(token, expires.toISOString());
		reply.setCookie(SESSION_COOKIE, token, {
			httpOnly: true,
			sameSite: "strict",
			secure: options.production ?? false,
			path: "/",
			maxAge: SESSION_SECONDS
		});
		return sessionSchema.parse({ authenticated: true });
	});

	app.post("/api/auth/logout", async (request, reply) => {
		const token = request.cookies[SESSION_COOKIE];
		if (token) database.deleteSession(token);
		reply.clearCookie(SESSION_COOKIE, { path: "/" });
		return sessionSchema.parse({ authenticated: false });
	});

	app.get("/api/categories", async () => categoriesResponseSchema.parse({ categories: database.listCategories() }));

	app.post("/api/categories", async (request, reply) => {
		const category = database.createCategory(parse(createCategorySchema, request.body));
		return reply.code(201).send(categorySchema.parse(category));
	});

	app.patch("/api/categories/:id", async (request, reply) => {
		const { id } = parse(z.object({ id: z.string().min(1) }), request.params);
		const category = database.updateCategory(id, parse(updateCategorySchema, request.body));
		if (!category) return sendError(reply, 404, "CATEGORY_NOT_FOUND", "找不到這個分類");
		return categorySchema.parse(category);
	});

	app.get("/api/tasks", async request => {
		const { sprintStart } = parse(z.object({ sprintStart: isoDateSchema }), request.query);
		return sprintTasksResponseSchema.parse({
			sprintStart,
			tasks: database.listTasks(sprintStart)
		});
	});

	app.get("/api/tasks/backlog", async () =>
		taskListResponseSchema.parse({
			tasks: database.listBacklogTasks()
		})
	);

	app.post("/api/tasks", async (request, reply) => {
		const task = database.createTask(parse(createTaskSchema, request.body));
		return reply.code(201).send(taskSchema.parse(task));
	});

	app.patch("/api/tasks/:id", async (request, reply) => {
		const { id } = parse(z.object({ id: z.string().min(1) }), request.params);
		const result = database.updateTask(id, parse(updateTaskSchema, request.body));
		if (result === null) return sendError(reply, 404, "TASK_NOT_FOUND", "找不到這個項目");
		if (result === "VERSION_CONFLICT") {
			return sendError(reply, 409, "VERSION_CONFLICT", "項目已在其他地方更新，已重新同步");
		}
		return taskSchema.parse(result);
	});

	app.delete("/api/tasks/:id", async (request, reply) => {
		const { id } = parse(z.object({ id: z.string().min(1) }), request.params);
		if (!database.deleteTask(id)) {
			return sendError(reply, 404, "TASK_NOT_FOUND", "找不到這個項目");
		}
		return reply.code(204).send();
	});

	app.setErrorHandler((error, request, reply) => {
		if (error instanceof ZodError) {
			return sendError(reply, 400, "INVALID_REQUEST", "輸入內容有誤", error.flatten());
		}
		const appError = error as Error & { code?: string; errcode?: number; statusCode?: number };
		if (appError.errcode === 2067) {
			return sendError(reply, 409, "ALREADY_EXISTS", "相同名稱已經存在");
		}
		if (appError.statusCode && appError.statusCode < 500) {
			return sendError(reply, appError.statusCode, "INVALID_REQUEST", appError.message);
		}
		request.log.error(appError);
		return sendError(reply, 500, "INTERNAL_SERVER_ERROR", "伺服器暫時無法處理請求");
	});

	if (options.serveWeb) {
		const root = options.webRoot ?? resolve(import.meta.dirname, "../../web/dist");
		if (!existsSync(root)) throw new Error(`Web build not found at ${root}`);
		await app.register(fastifyStatic, { root, wildcard: false });
		app.get("/*", async (request, reply) => {
			if (request.url.startsWith("/api/")) return reply.callNotFound();
			return reply.sendFile("index.html", { maxAge: 0, immutable: false });
		});
	}

	app.addHook("onClose", async () => database.close());
	return app;
}

function parse<T>(schema: ZodType<T>, value: unknown): T {
	return schema.parse(value);
}

function isPublicApiPath(url: string): boolean {
	const path = url.split("?")[0];
	return path === "/api/auth/login" || path === "/api/auth/session";
}

function sendError(reply: FastifyReply, status: number, code: string, message: string, details?: unknown) {
	return reply.code(status).send(
		apiErrorSchema.parse({
			error: { code, message, ...(details === undefined ? {} : { details }) }
		})
	);
}
