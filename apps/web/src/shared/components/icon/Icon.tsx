import {
	ArrowLeft,
	ArrowRight,
	CalendarDays,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	CircleHelp,
	Clock3,
	Columns3,
	Flag,
	GripVertical,
	History,
	Hourglass,
	Inbox,
	Link,
	List,
	LogOut,
	Menu,
	Moon,
	Pencil,
	Plus,
	Rows3,
	Search,
	Settings,
	Sun,
	TableProperties,
	Trash2,
	WifiOff,
	X,
	type LucideIcon,
	type LucideProps
} from "lucide-react";

const icons = {
	add: Plus,
	arrowLeft: ArrowLeft,
	arrowRight: ArrowRight,
	board: Columns3,
	calendar: CalendarDays,
	check: Check,
	chevronDown: ChevronDown,
	chevronLeft: ChevronLeft,
	chevronRight: ChevronRight,
	chevronUp: ChevronUp,
	clock: Clock3,
	close: X,
	compact: Rows3,
	drag: GripVertical,
	edit: Pencil,
	flag: Flag,
	help: CircleHelp,
	history: History,
	hourglass: Hourglass,
	inbox: Inbox,
	link: Link,
	list: List,
	logout: LogOut,
	menu: Menu,
	moon: Moon,
	search: Search,
	settings: Settings,
	trash: Trash2,
	sun: Sun,
	table: TableProperties,
	wifiOff: WifiOff
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
	const Component = icons[name];

	return <Component aria-hidden="true" focusable="false" strokeWidth={2} {...props} />;
}
