import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	resolve: {
		alias: {
			"@": new URL("./src", import.meta.url).pathname
		}
	},
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["icon.svg", "icon-192.png", "icon-512.png", "maskable-icon-512.png"],
			manifest: {
				name: "EM's To Do",
				short_name: "EM's To Do",
				description: "以每週 sprint 為核心的待辦清單。",
				theme_color: "#DC5002",
				background_color: "#FFF8F6",
				display: "standalone",
				start_url: "/",
				scope: "/",
				lang: "zh-Hant-TW",
				orientation: "any",
				categories: ["productivity", "utilities"],
				icons: [
					{
						src: "/icon-192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any"
					},
					{
						src: "/icon-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any"
					},
					{
						src: "/maskable-icon-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable"
					}
				],
				shortcuts: [
					{
						name: "新增項目",
						short_name: "新增",
						url: "/app?action=new",
						icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }]
					}
				]
			},
			workbox: {
				navigateFallback: "/index.html",
				navigateFallbackDenylist: [/^\/api\//, /^\/healthz$/],
				runtimeCaching: [
					{
						urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
						handler: "NetworkOnly"
					}
				]
			},
			devOptions: { enabled: true }
		})
	],
	server: {
		port: 5173,
		strictPort: true,
		proxy: {
			"/api": "http://localhost:3000",
			"/healthz": "http://localhost:3000"
		}
	},
	build: {
		target: "es2022",
		cssMinify: "lightningcss",
		sourcemap: true
	}
});
