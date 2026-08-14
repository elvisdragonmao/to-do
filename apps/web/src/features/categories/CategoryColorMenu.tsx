import type { Category } from "@sprintly/shared";
import { ContextMenu } from "@base-ui/react/context-menu";
import type { ReactNode } from "react";

const CATEGORY_COLORS = ["#A69697", "#DD8406", "#DC5002", "#282421", "#5A4943", "#A33A00", "#356A25", "#50647A"];

export function CategoryColorMenu({ category, children, onChange }: { category: Category; children: ReactNode; onChange: (color: string) => void }) {
	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger>{children}</ContextMenu.Trigger>
			<ContextMenu.Portal>
				<ContextMenu.Positioner className="context-menu-positioner">
					<ContextMenu.Popup className="context-menu-popup">
						<ContextMenu.Group>
							<ContextMenu.GroupLabel className="context-menu-label">{category.name} · 顏色</ContextMenu.GroupLabel>
							{CATEGORY_COLORS.map(color => (
								<ContextMenu.Item className="context-menu-item" key={color} onClick={() => onChange(color)}>
									<span className="category-swatch" style={{ backgroundColor: color }} />
									{color}
									{category.color.toUpperCase() === color ? <span aria-label="目前使用">✓</span> : null}
								</ContextMenu.Item>
							))}
						</ContextMenu.Group>
					</ContextMenu.Popup>
				</ContextMenu.Positioner>
			</ContextMenu.Portal>
		</ContextMenu.Root>
	);
}
