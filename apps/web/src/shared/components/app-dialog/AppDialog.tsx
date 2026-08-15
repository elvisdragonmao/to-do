import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";

import { Icon } from "../icon/Icon.js";
import styles from "./AppDialog.module.css";

export function AppDialog({
	children,
	description,
	open,
	onOpenChange,
	title,
	wide = false
}: {
	children: ReactNode;
	description?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	wide?: boolean;
}) {
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className={styles.backdrop} />
				<Dialog.Viewport className={styles.viewport}>
					<Dialog.Popup className={[styles.popup, wide ? styles.wide : ""].filter(Boolean).join(" ")}>
						<header className={styles.header}>
							<div>
								<Dialog.Title className={styles.title}>{title}</Dialog.Title>
								{description ? <Dialog.Description className={styles.description}>{description}</Dialog.Description> : null}
							</div>
							<Dialog.Close aria-label="關閉" className={styles.close} title="關閉 (Esc)">
								<Icon name="close" />
							</Dialog.Close>
						</header>
						{children}
					</Dialog.Popup>
				</Dialog.Viewport>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
