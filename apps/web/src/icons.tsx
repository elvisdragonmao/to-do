import type { SVGProps } from "react";

const paths = {
	add: "M12 5v14M5 12h14",
	arrowLeft: "m15 18-6-6 6-6",
	arrowRight: "m9 18 6-6-6-6",
	board: "M4 5h5v14H4zM15 5h5v9h-5z",
	calendar: "M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z",
	check: "m5 12 4 4L19 6",
	close: "M6 6l12 12M18 6 6 18",
	drag: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
	edit: "m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Zm10.5-13.5 3 3",
	help: "M9.1 9a3 3 0 1 1 4.8 2.4c-1.3 1-1.9 1.5-1.9 3.1M12 19h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
	list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
	logout: "M10 17l5-5-5-5M15 12H3M15 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5",
	menu: "M4 7h16M4 12h16M4 17h16",
	search: "m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
	settings:
		"M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3.1 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z",
	trash: "M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6",
	wifiOff: "m2 2 20 20M8.5 8.5A10.5 10.5 0 0 1 21 9M3 9a16 16 0 0 1 2.4-1.7M8.5 13.5a5 5 0 0 1 7 0M12 19h.01"
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
	return (
		<svg aria-hidden="true" fill="none" height="24" viewBox="0 0 24 24" width="24" {...props}>
			<path d={paths[name]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
		</svg>
	);
}
