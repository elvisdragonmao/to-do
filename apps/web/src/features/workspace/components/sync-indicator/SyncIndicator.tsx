import { onlineManager, useIsFetching, useIsMutating, useMutationState } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { Icon } from "../../../../shared/components/icon/Icon.js";
import { Spinner } from "../../../../shared/components/spinner/Spinner.js";
import { taskQueryKeys } from "../../services/task-queries.js";
import styles from "./SyncIndicator.module.css";

export function SyncIndicator() {
	const online = useSyncExternalStore(
		callback => onlineManager.subscribe(callback),
		() => onlineManager.isOnline(),
		() => true
	);
	const fetching = useIsFetching({ queryKey: taskQueryKeys.all });
	const mutating = useIsMutating({ mutationKey: taskQueryKeys.all });
	const queued = useMutationState({
		filters: { status: "pending" },
		select: mutation => mutation.state.isPaused
	}).filter(Boolean).length;

	if (!online) {
		return (
			<div className={[styles.pill, styles.offline].join(" ")} role="status">
				<Icon name="wifiOff" />
				離線{queued > 0 ? ` · ${queued} 項待同步` : " · 顯示快取"}
			</div>
		);
	}
	if (mutating > 0 || queued > 0) {
		return (
			<div className={[styles.pill, styles.active].join(" ")} role="status">
				<Spinner label="正在同步變更" size="small" />
				正在同步 {Math.max(mutating, queued)} 項
			</div>
		);
	}
	if (fetching > 0) {
		return (
			<div className={styles.pill} role="status">
				<Spinner label="正在檢查更新" size="small" />
				檢查更新
			</div>
		);
	}
	return (
		<div className={[styles.pill, styles.synced].join(" ")} role="status">
			<span aria-hidden="true" className={styles.dot} />
			已同步
		</div>
	);
}
