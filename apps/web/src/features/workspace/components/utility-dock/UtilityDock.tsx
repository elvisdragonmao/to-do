import { useMutation, useQueryClient } from "@tanstack/react-query";

import { logout } from "@/features/auth/services/auth-api.js";
import { Icon } from "@/shared/components/icon/Icon.js";
import { Spinner } from "@/shared/components/spinner/Spinner.js";
import { persister } from "@/shared/services/query-client.js";
import styles from "./UtilityDock.module.css";

export function UtilityDock({ onHelp, onTheme, theme }: { onHelp: () => void; onTheme: () => void; theme: "light" | "dark" }) {
	return (
		<div className={styles.dock}>
			<button aria-label="快捷鍵" onClick={onHelp} title="快捷鍵 (⌘/)" type="button">
				<Icon name="help" />
				<span>Help</span>
			</button>
			<button aria-label={theme === "dark" ? "切換亮色" : "切換暗色"} onClick={onTheme} type="button">
				<Icon name={theme === "dark" ? "sun" : "moon"} />
			</button>
			<LogoutButton />
		</div>
	);
}

function LogoutButton() {
	const client = useQueryClient();
	const mutation = useMutation({
		mutationFn: logout,
		onSuccess: async () => {
			client.clear();
			await persister.removeClient();
			window.location.assign("/login");
		}
	});
	return (
		<button aria-label="登出" disabled={mutation.isPending} onClick={() => mutation.mutate()} type="button">
			{mutation.isPending ? <Spinner label="登出中" size="small" /> : <Icon name="logout" />}
		</button>
	);
}
