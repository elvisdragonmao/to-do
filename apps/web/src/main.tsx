import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { onlineManager } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";

import { App } from "./App.js";
import { persistOptions, queryClient } from "./queries.js";
import "./styles.css";

onlineManager.setEventListener(setOnline => {
	const update = () => setOnline(navigator.onLine);
	update();
	window.addEventListener("online", update);
	window.addEventListener("offline", update);
	return () => {
		window.removeEventListener("online", update);
		window.removeEventListener("offline", update);
	};
});

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<PersistQueryClientProvider client={queryClient} persistOptions={persistOptions} onSuccess={() => queryClient.resumePausedMutations()}>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</PersistQueryClientProvider>
	</StrictMode>
);
