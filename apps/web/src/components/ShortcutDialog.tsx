import { AppDialog } from "./AppDialog.js";

const shortcuts: [string, string][] = [
	["N", "新增項目"],
	["/", "搜尋項目"],
	["1", "切換清單檢視"],
	["2", "切換 Kanban"],
	["[ / ]", "上一個／下一個 sprint"],
	["← / →", "在 sprint tabs 間移動"],
	["↑ / ↓", "在項目間移動焦點"],
	["Enter", "編輯焦點項目"],
	["X", "完成／取消完成焦點項目"],
	["?", "顯示這份快捷鍵"],
	["Esc", "關閉對話框"]
];

export function ShortcutDialog({ onClose, open }: { onClose: () => void; open: boolean }) {
	return (
		<AppDialog description="不用離開鍵盤就能安排完整的一週。" onOpenChange={next => (next ? undefined : onClose())} open={open} title="鍵盤快捷鍵">
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
