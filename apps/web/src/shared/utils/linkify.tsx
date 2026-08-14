import type { ReactNode } from "react";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

export function linkify(value: string): ReactNode[] {
	return value.split(URL_PATTERN).map((part, index) =>
		/^https?:\/\//.test(part) ? (
			<a href={part} key={`${part}-${index}`} onClick={event => event.stopPropagation()} rel="noreferrer" target="_blank">
				{part}
			</a>
		) : (
			part
		)
	);
}
