import { useCallback, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "em-todo-theme";

export function initializeTheme(): Theme {
	const stored = localStorage.getItem(STORAGE_KEY);
	const theme: Theme = stored === "light" || stored === "dark" ? stored : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	document.documentElement.dataset.theme = theme;
	return theme;
}

export function useTheme(): [Theme, () => void] {
	const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
	const toggle = useCallback(() => {
		setTheme(current => {
			const next = current === "dark" ? "light" : "dark";
			document.documentElement.dataset.theme = next;
			localStorage.setItem(STORAGE_KEY, next);
			return next;
		});
	}, []);
	return [theme, toggle];
}
