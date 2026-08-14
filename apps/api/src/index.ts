import { resolve } from "node:path";

import { createApp } from "./app.js";

const production = process.env.NODE_ENV === "production";
const password = process.env.APP_PASSWORD;

if (production && !password) {
	throw new Error("APP_PASSWORD is required in production");
}

const app = await createApp({
	databasePath: process.env.DATABASE_PATH ?? resolve(import.meta.dirname, "../../../data/em-to-do.sqlite"),
	password: password ?? "em-to-do",
	production,
	serveWeb: production,
	webRoot: process.env.WEB_ROOT,
	logger: true
});

const port = Number(process.env.PORT ?? 3000);
await app.listen({ host: "0.0.0.0", port });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		void app.close().finally(() => process.exit(0));
	});
}
