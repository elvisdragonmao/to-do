import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";

export function useSprintPager(ref: RefObject<HTMLElement | null>, sprintStart: string, onPrevious: () => void, onNext: () => void): (direction: -1 | 1) => void {
	const resetting = useRef(true);
	const navigating = useRef(false);
	const ignoreUntil = useRef(0);

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		resetting.current = true;
		navigating.current = false;
		ignoreUntil.current = performance.now() + 350;
		element.classList.add("is-resetting");
		element.scrollTop = element.clientHeight;
		const frame = requestAnimationFrame(() => {
			element.classList.remove("is-resetting");
			resetting.current = false;
		});
		return () => cancelAnimationFrame(frame);
	}, [ref, sprintStart]);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		let previousHeight = element.clientHeight;
		let frame = 0;
		const observer = new ResizeObserver(() => {
			const nextHeight = element.clientHeight;
			if (!nextHeight || nextHeight === previousHeight || navigating.current) return;
			previousHeight = nextHeight;
			resetting.current = true;
			ignoreUntil.current = performance.now() + 350;
			element.classList.add("is-resetting");
			element.scrollTop = nextHeight;
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				element.classList.remove("is-resetting");
				resetting.current = false;
			});
		});
		observer.observe(element);
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	}, [ref]);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		let settleTimer = 0;

		const settle = () => {
			if (resetting.current || navigating.current || performance.now() < ignoreUntil.current) return;
			const pageHeight = element.clientHeight;
			if (!pageHeight) return;
			const page = Math.round(element.scrollTop / pageHeight);
			const snapped = Math.abs(element.scrollTop - page * pageHeight) <= Math.max(3, pageHeight * 0.04);
			if (!snapped || page === 1) return;
			navigating.current = true;
			page < 1 ? onPrevious() : onNext();
		};

		const onScroll = () => {
			window.clearTimeout(settleTimer);
			settleTimer = window.setTimeout(settle, 120);
		};

		element.addEventListener("scroll", onScroll, { passive: true });
		element.addEventListener("scrollend", settle);
		return () => {
			window.clearTimeout(settleTimer);
			element.removeEventListener("scroll", onScroll);
			element.removeEventListener("scrollend", settle);
		};
	}, [onNext, onPrevious, ref]);

	return useCallback(
		(direction: -1 | 1) => {
			const element = ref.current;
			if (!element || navigating.current) return;
			const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			element.scrollTo({
				behavior: reducedMotion ? "auto" : "smooth",
				top: direction < 0 ? 0 : element.clientHeight * 2
			});
		},
		[ref]
	);
}
