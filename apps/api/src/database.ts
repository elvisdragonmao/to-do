import {
	type Category,
	type CreateCategoryInput,
	type CreateTaskInput,
	type Task,
	type UpdateCategoryInput,
	type UpdateTaskInput,
	resolvePlacementHistory,
	taskPlacementSchema
} from "@sprintly/shared";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { hashPassword, hashSessionToken, verifyPassword } from "./password.js";

const DEFAULT_CATEGORY_ID = "uncategorized";

type TaskRow = {
	id: string;
	title: string;
	description: string;
	created_at: string;
	updated_at: string;
	sprint_start: string;
	scheduled_date: string | null;
	initial_planned_date: string;
	last_planned_date: string;
	category_id: string;
	urgency: number;
	estimated_hours: number | null;
	due_date: string | null;
	status: Task["status"];
	sort_order: number;
	version: number;
};

type CategoryRow = {
	id: string;
	name: string;
	color: string;
	is_default: number;
	created_at: string;
	sort_order: number;
};

export class SprintlyDatabase {
	readonly db: DatabaseSync;

	constructor(path: string) {
		if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
		this.db = new DatabaseSync(path);
		this.db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
		this.migrate();
	}

	async initializePassword(password: string): Promise<void> {
		const current = this.db.prepare("SELECT value FROM app_settings WHERE key = 'password_hash'").get() as { value: string } | undefined;
		if (current) return;
		const hash = await hashPassword(password);
		this.db.prepare("INSERT INTO app_settings (key, value) VALUES ('password_hash', ?)").run(hash);
	}

	async checkPassword(password: string): Promise<boolean> {
		const row = this.db.prepare("SELECT value FROM app_settings WHERE key = 'password_hash'").get() as { value: string } | undefined;
		return row ? verifyPassword(password, row.value) : false;
	}

	createSession(token: string, expiresAt: string): void {
		const now = new Date().toISOString();
		this.db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
		this.db.prepare("INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)").run(hashSessionToken(token), now, expiresAt);
	}

	hasSession(token: string): boolean {
		const row = this.db.prepare("SELECT 1 FROM sessions WHERE token_hash = ? AND expires_at > ?").get(hashSessionToken(token), new Date().toISOString());
		return Boolean(row);
	}

	deleteSession(token: string): void {
		this.db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(token));
	}

	listCategories(): Category[] {
		const rows = this.db.prepare("SELECT * FROM categories ORDER BY sort_order, created_at").all() as CategoryRow[];
		return rows.map(mapCategory);
	}

	createCategory(input: CreateCategoryInput): Category {
		const category: Category = {
			...input,
			id: randomUUID(),
			isDefault: false,
			createdAt: new Date().toISOString(),
			sortOrder: Date.now()
		};
		this.db
			.prepare("INSERT INTO categories (id, name, color, is_default, created_at, sort_order) VALUES (?, ?, ?, 0, ?, ?)")
			.run(category.id, category.name, category.color, category.createdAt, category.sortOrder);
		return category;
	}

	updateCategory(id: string, input: UpdateCategoryInput): Category | null {
		const result = this.db.prepare("UPDATE categories SET color = ? WHERE id = ?").run(input.color, id);
		if (result.changes !== 1) return null;
		const row = this.db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as CategoryRow;
		return mapCategory(row);
	}

	listTasks(sprintStart: string): Task[] {
		const rows = this.db.prepare("SELECT * FROM tasks WHERE sprint_start = ? ORDER BY status, scheduled_date IS NOT NULL, scheduled_date, sort_order, created_at").all(sprintStart) as TaskRow[];
		return rows.map(mapTask);
	}

	getTask(id: string): Task | null {
		const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
		return row ? mapTask(row) : null;
	}

	createTask(input: CreateTaskInput): Task {
		const now = new Date().toISOString();
		const task: Task = {
			id: randomUUID(),
			title: input.title,
			description: input.description,
			createdAt: now,
			updatedAt: now,
			sprintStart: input.sprintStart,
			scheduledDate: input.scheduledDate,
			initialPlannedDate: input.scheduledDate ?? input.sprintStart,
			lastPlannedDate: input.scheduledDate ?? input.sprintStart,
			categoryId: input.categoryId || DEFAULT_CATEGORY_ID,
			urgency: input.urgency,
			estimatedHours: input.estimatedHours,
			dueDate: input.dueDate,
			status: input.status,
			sortOrder: Date.now(),
			version: 1
		};

		this.db
			.prepare(
				`INSERT INTO tasks (
          id, title, description, created_at, updated_at, sprint_start, scheduled_date,
          initial_planned_date, last_planned_date, category_id, urgency,
          estimated_hours, due_date, status, sort_order, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				task.id,
				task.title,
				task.description,
				task.createdAt,
				task.updatedAt,
				task.sprintStart,
				task.scheduledDate,
				task.initialPlannedDate,
				task.lastPlannedDate,
				task.categoryId,
				task.urgency,
				task.estimatedHours,
				task.dueDate,
				task.status,
				task.sortOrder,
				task.version
			);
		return task;
	}

	updateTask(id: string, input: UpdateTaskInput): Task | "VERSION_CONFLICT" | null {
		const current = this.getTask(id);
		if (!current) return null;
		if (current.version !== input.version) return "VERSION_CONFLICT";

		const nextSprintStart = input.sprintStart ?? current.sprintStart;
		const nextScheduledDate = input.scheduledDate === undefined ? current.scheduledDate : input.scheduledDate;
		taskPlacementSchema.parse({
			sprintStart: nextSprintStart,
			scheduledDate: nextScheduledDate
		});

		const placementChanged = nextSprintStart !== current.sprintStart || nextScheduledDate !== current.scheduledDate;
		const automaticHistory = placementChanged
			? resolvePlacementHistory(current, nextSprintStart, nextScheduledDate)
			: {
					initialPlannedDate: current.initialPlannedDate,
					lastPlannedDate: current.lastPlannedDate
				};

		const next: Task = {
			...current,
			...input,
			sprintStart: nextSprintStart,
			scheduledDate: nextScheduledDate,
			initialPlannedDate: input.initialPlannedDate ?? automaticHistory.initialPlannedDate,
			lastPlannedDate: input.lastPlannedDate ?? automaticHistory.lastPlannedDate,
			updatedAt: new Date().toISOString(),
			version: current.version + 1
		};

		const result = this.db
			.prepare(
				`UPDATE tasks SET
          title = ?, description = ?, updated_at = ?, sprint_start = ?, scheduled_date = ?,
          initial_planned_date = ?, last_planned_date = ?, category_id = ?, urgency = ?,
          estimated_hours = ?, due_date = ?, status = ?, sort_order = ?, version = ?
        WHERE id = ? AND version = ?`
			)
			.run(
				next.title,
				next.description,
				next.updatedAt,
				next.sprintStart,
				next.scheduledDate,
				next.initialPlannedDate,
				next.lastPlannedDate,
				next.categoryId,
				next.urgency,
				next.estimatedHours,
				next.dueDate,
				next.status,
				next.sortOrder,
				next.version,
				id,
				current.version
			);
		return result.changes === 1 ? next : "VERSION_CONFLICT";
	}

	deleteTask(id: string): boolean {
		return this.db.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes === 1;
	}

	close(): void {
		this.db.close();
	}

	private migrate(): void {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        color TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        sort_order REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sprint_start TEXT NOT NULL,
        scheduled_date TEXT,
        initial_planned_date TEXT NOT NULL,
        last_planned_date TEXT NOT NULL,
        category_id TEXT NOT NULL REFERENCES categories(id),
        urgency INTEGER NOT NULL CHECK (urgency BETWEEN 1 AND 4),
        estimated_hours REAL CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
        due_date TEXT,
        status TEXT NOT NULL CHECK (status IN ('TODO', 'DOING', 'DONE')),
        sort_order REAL NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS tasks_sprint_position
        ON tasks (sprint_start, scheduled_date, status, sort_order);
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions (expires_at);
    `);

		this.db
			.prepare(
				`INSERT OR IGNORE INTO categories
          (id, name, color, is_default, created_at, sort_order)
         VALUES (?, '未分類', '#5f5e62', 1, ?, 0)`
			)
			.run(DEFAULT_CATEGORY_ID, new Date().toISOString());
	}
}

function mapTask(row: TaskRow): Task {
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		sprintStart: row.sprint_start,
		scheduledDate: row.scheduled_date,
		initialPlannedDate: row.initial_planned_date,
		lastPlannedDate: row.last_planned_date,
		categoryId: row.category_id,
		urgency: row.urgency,
		estimatedHours: row.estimated_hours,
		dueDate: row.due_date,
		status: row.status,
		sortOrder: row.sort_order,
		version: row.version
	};
}

function mapCategory(row: CategoryRow): Category {
	return {
		id: row.id,
		name: row.name,
		color: row.color,
		isDefault: row.is_default === 1,
		createdAt: row.created_at,
		sortOrder: row.sort_order
	};
}
