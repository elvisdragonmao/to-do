import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";

export type SprintPagerDirection = -1 | 0 | 1;

export function useSprintPager(
	ref: RefObject<HTMLElement | null>,
	sprintStart: string,
	onPrevious: () => void,
	onNext: () => void,
	onPreview?: (direction: SprintPagerDirection) => void,
	locked = false
): (direction: -1 | 1) => void {
	const resetting = useRef(true);
	const navigating = useRef(false);
	const ignoreUntil = useRef(0);
	const previewDirection = useRef<SprintPagerDirection>(0);
	const snapTargetDirection = useRef<SprintPagerDirection | null>(null);
	const setPreviewDirection = useCallback(
		(direction: SprintPagerDirection) => {
			if (previewDirection.current === direction) return;
			previewDirection.current = direction;
			onPreview?.(direction);
		},
		[onPreview]
	);

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		resetting.current = true;
		navigating.current = false;
		snapTargetDirection.current = null;
		ignoreUntil.current = performance.now() + 350;
		setPreviewDirection(0);
		element.classList.add("is-resetting");
		element.scrollTop = pageOffsets(element)[1] ?? element.clientHeight;
		const frame = requestAnimationFrame(() => {
			element.classList.remove("is-resetting");
			resetting.current = false;
		});
		return () => cancelAnimationFrame(frame);
	}, [ref, setPreviewDirection, sprintStart]);

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
			snapTargetDirection.current = null;
			ignoreUntil.current = performance.now() + 350;
			setPreviewDirection(0);
			element.classList.add("is-resetting");
			element.scrollTop = pageOffsets(element)[1] ?? nextHeight;
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
	}, [ref, setPreviewDirection]);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		let settleTimer = 0;
		let previewFrame = 0;

		const previewPage = (index: number) => setPreviewDirection(pageDirection(index));
		const previewNearestPage = () => {
			previewFrame = 0;
			if (locked || resetting.current || snapTargetDirection.current !== null) return;
			previewPage(nearestPageIndex(element));
		};
		const settle = () => {
			if (locked || resetting.current || navigating.current) return;
			const ignoreFor = ignoreUntil.current - performance.now();
			if (ignoreFor > 0) {
				window.clearTimeout(settleTimer);
				settleTimer = window.setTimeout(settle, ignoreFor + 20);
				return;
			}
			const offsets = pageOffsets(element);
			if (offsets.length < 3) return;
			const page = nearestPageIndex(element, offsets);
			const snappedOffset = offsets[page];
			if (snappedOffset === undefined) return;
			const snapped = Math.abs(element.scrollTop - snappedOffset) <= Math.max(3, element.clientHeight * 0.04);
			if (!snapped) return;
			snapTargetDirection.current = null;
			previewPage(page);
			if (page === 1) return;
			navigating.current = true;
			page < 1 ? onPrevious() : onNext();
		};

		const onScroll = () => {
			if (locked) return;
			window.clearTimeout(settleTimer);
			settleTimer = window.setTimeout(settle, 120);
			if (!previewFrame) previewFrame = requestAnimationFrame(previewNearestPage);
		};
		const onSnapChanging = (event: Event) => {
			if (locked || resetting.current) return;
			const target = (event as Event & { snapTargetBlock?: Element | null }).snapTargetBlock;
			const page = target ? sprintPages(element).indexOf(target as HTMLElement) : -1;
			if (page >= 0) {
				snapTargetDirection.current = pageDirection(page);
				previewPage(page);
			}
		};

		element.addEventListener("scroll", onScroll, { passive: true });
		element.addEventListener("scrollend", settle);
		element.addEventListener("scrollsnapchanging", onSnapChanging);
		return () => {
			window.clearTimeout(settleTimer);
			cancelAnimationFrame(previewFrame);
			element.removeEventListener("scroll", onScroll);
			element.removeEventListener("scrollend", settle);
			element.removeEventListener("scrollsnapchanging", onSnapChanging);
		};
	}, [locked, onNext, onPrevious, ref, setPreviewDirection]);

	return useCallback(
		(direction: -1 | 1) => {
			const element = ref.current;
			if (!element || locked || navigating.current) return;
			const offsets = pageOffsets(element);
			const target = offsets[direction + 1];
			if (target === undefined) return;
			snapTargetDirection.current = direction;
			setPreviewDirection(direction);
			const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			element.scrollTo({ behavior: reducedMotion ? "auto" : "smooth", top: target });
		},
		[locked, ref, setPreviewDirection]
	);
}

function sprintPages(element: HTMLElement): HTMLElement[] {
	return Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains("sprint-page"));
}

function pageOffsets(element: HTMLElement): number[] {
	return sprintPages(element).map(page => page.offsetTop);
}

function nearestPageIndex(element: HTMLElement, offsets = pageOffsets(element)): number {
	let nearest = 0;
	for (let index = 1; index < offsets.length; index += 1) {
		const candidate = offsets[index];
		const current = offsets[nearest];
		if (candidate !== undefined && current !== undefined && Math.abs(element.scrollTop - candidate) < Math.abs(element.scrollTop - current)) nearest = index;
	}
	return nearest;
}

function pageDirection(page: number): SprintPagerDirection {
	return Math.max(-1, Math.min(1, page - 1)) as SprintPagerDirection;
}
