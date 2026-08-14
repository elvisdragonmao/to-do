import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";

export function useSprintPager(
	ref: RefObject<HTMLElement | null>,
	sprintStart: string,
	onNavigate: (sprintStart: string) => void,
	onPreview?: (sprintStart: string) => void,
	locked = false
): (direction: -1 | 1) => void {
	const resetting = useRef(true);
	const navigating = useRef(false);
	const ignoreUntil = useRef(0);
	const previewSprint = useRef(sprintStart);
	const snapTargetSprint = useRef<string | null>(null);
	const setPreviewSprint = useCallback(
		(nextSprint: string) => {
			if (previewSprint.current === nextSprint) return;
			previewSprint.current = nextSprint;
			onPreview?.(nextSprint);
		},
		[onPreview]
	);
	const resetToCurrentPage = useCallback(() => {
		const element = ref.current;
		if (!element) return;
		const currentPage = sprintPages(element).find(page => page.dataset.sprintStart === sprintStart);
		if (!currentPage) return;
		resetting.current = true;
		navigating.current = false;
		snapTargetSprint.current = null;
		ignoreUntil.current = performance.now() + 350;
		setPreviewSprint(sprintStart);
		element.classList.add("is-resetting");
		element.scrollTop = currentPage.offsetTop;
		return requestAnimationFrame(() => {
			element.classList.remove("is-resetting");
			resetting.current = false;
		});
	}, [ref, setPreviewSprint, sprintStart]);

	useLayoutEffect(() => {
		const frame = resetToCurrentPage();
		return () => {
			if (frame !== undefined) cancelAnimationFrame(frame);
		};
	}, [resetToCurrentPage]);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		let previousHeight = element.clientHeight;
		let frame = 0;
		const observer = new ResizeObserver(() => {
			const nextHeight = element.clientHeight;
			if (!nextHeight || nextHeight === previousHeight || navigating.current) return;
			previousHeight = nextHeight;
			cancelAnimationFrame(frame);
			frame = resetToCurrentPage() ?? 0;
		});
		observer.observe(element);
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	}, [ref, resetToCurrentPage]);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		let settleTimer = 0;
		let previewFrame = 0;

		const previewPage = (page: HTMLElement | undefined) => {
			const nextSprint = page?.dataset.sprintStart;
			if (nextSprint) setPreviewSprint(nextSprint);
		};
		const previewNearestPage = () => {
			previewFrame = 0;
			if (locked || resetting.current || snapTargetSprint.current !== null) return;
			previewPage(nearestPage(element));
		};
		const settle = () => {
			if (locked || resetting.current || navigating.current) return;
			const ignoreFor = ignoreUntil.current - performance.now();
			if (ignoreFor > 0) {
				window.clearTimeout(settleTimer);
				settleTimer = window.setTimeout(settle, ignoreFor + 20);
				return;
			}
			const page = nearestPage(element);
			if (!page) return;
			const snapped = Math.abs(element.scrollTop - page.offsetTop) <= Math.max(3, element.clientHeight * 0.04);
			if (!snapped) return;
			snapTargetSprint.current = null;
			previewPage(page);
			const nextSprint = page.dataset.sprintStart;
			if (!nextSprint || nextSprint === sprintStart) return;
			navigating.current = true;
			onNavigate(nextSprint);
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
			if (!(target instanceof HTMLElement) || !target.classList.contains("sprint-page")) return;
			const targetSprint = target.dataset.sprintStart;
			if (!targetSprint) return;
			snapTargetSprint.current = targetSprint;
			setPreviewSprint(targetSprint);
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
	}, [locked, onNavigate, ref, setPreviewSprint, sprintStart]);

	return useCallback(
		(direction: -1 | 1) => {
			const element = ref.current;
			if (!element || locked || navigating.current) return;
			const pages = sprintPages(element);
			const currentPageIndex = pages.findIndex(page => page.dataset.sprintStart === sprintStart);
			const targetPage = pages[currentPageIndex + direction];
			const targetSprint = targetPage?.dataset.sprintStart;
			if (!targetPage || !targetSprint) return;
			snapTargetSprint.current = targetSprint;
			setPreviewSprint(targetSprint);
			const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			element.scrollTo({ behavior: reducedMotion ? "auto" : "smooth", top: targetPage.offsetTop });
		},
		[locked, ref, setPreviewSprint, sprintStart]
	);
}

function sprintPages(element: HTMLElement): HTMLElement[] {
	return Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains("sprint-page"));
}

function nearestPage(element: HTMLElement): HTMLElement | undefined {
	const pages = sprintPages(element);
	let nearest = pages[0];
	for (let index = 1; index < pages.length; index += 1) {
		const candidate = pages[index];
		if (candidate && nearest && Math.abs(element.scrollTop - candidate.offsetTop) < Math.abs(element.scrollTop - nearest.offsetTop)) nearest = candidate;
	}
	return nearest;
}
