import { AppDialog } from "./AppDialog.js";

const shortcuts: [string, string][] = [
	["N", "新增項目"],
	["/", "搜尋項目"],
	["1", "Kanban View"],
	["2", "星期 View"],
	["T", "跳到今天"],
	["[ / ]", "上一個／下一個 sprint"],
	["方向鍵", "選擇項目"],
	["⌘ /", "快捷鍵列表"],
	["Esc", "關閉對話框"]
];

export function ShortcutDialog({ onClose, open }: { onClose: () => void; open: boolean }) {
	return (
		<AppDialog onOpenChange={next => (next ? undefined : onClose())} open={open} title="快捷鍵">
			<dl className="shortcut-list">
				{shortcuts.map(([keys, action]) => (
					<div key={keys}>
						<dt>
							{keys.split(" / ").map(key => (
								<kbd key={key}>{key}</kbd>
							))}
						</dt>
						<dd>{action}</dd>
					</div>
				))}
			</dl>
		</AppDialog>
	);
}
