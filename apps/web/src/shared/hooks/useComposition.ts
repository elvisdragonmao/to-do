import { useCallback, useRef } from "react";
import type { KeyboardEvent } from "react";

export type CompositionProps = {
	onCompositionEnd: () => void;
	onCompositionStart: () => void;
};

export function useComposition(): { compositionProps: CompositionProps; isComposing: (event: KeyboardEvent) => boolean } {
	const composingRef = useRef(false);
	const onCompositionStart = useCallback(() => {
		composingRef.current = true;
	}, []);
	const onCompositionEnd = useCallback(() => {
		// Safari 送出 compositionend 的時機早於送出候選字的那個 keydown，所以延後一幀才解除。
		requestAnimationFrame(() => {
			composingRef.current = false;
		});
	}, []);
	const isComposing = useCallback((event: KeyboardEvent) => composingRef.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229, []);

	return { compositionProps: { onCompositionEnd, onCompositionStart }, isComposing };
}
