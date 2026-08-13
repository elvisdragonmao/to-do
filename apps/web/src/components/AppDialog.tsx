import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";

import { Icon } from "../icons.js";

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
				<Dialog.Backdrop className="dialog-backdrop" />
				<Dialog.Viewport className="dialog-viewport">
					<Dialog.Popup className={`dialog-popup${wide ? " dialog-popup--wide" : ""}`}>
						<header className="dialog-header">
							<div>
								<Dialog.Title className="dialog-title">{title}</Dialog.Title>
								{description ? <Dialog.Description className="dialog-description">{description}</Dialog.Description> : null}
							</div>
							<Dialog.Close aria-label="關閉" className="icon-button" title="關閉 (Esc)">
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
