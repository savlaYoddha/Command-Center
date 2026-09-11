import { useCallback, useEffect, useRef, useState } from "react";
import type { ChartPoint } from "./chartUtils";

export type ChartZoomLevel = {
  id: string;
  label: string;
  data: ChartPoint[];
};

type UseChartZoomOptions = {
  levels: ChartZoomLevel[];
  defaultLevelId?: string;
};

function touchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

export function useChartZoom({ levels, defaultLevelId }: UseChartZoomOptions) {
  const defaultIndex = Math.max(
    0,
    defaultLevelId ? levels.findIndex((level) => level.id === defaultLevelId) : levels.length - 1,
  );
  const [levelIndex, setLevelIndex] = useState(defaultIndex >= 0 ? defaultIndex : levels.length - 1);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pinchStartDist = useRef<number | null>(null);
  const pinchLatestDist = useRef<number | null>(null);
  const wheelCooldown = useRef(false);

  const zoomIn = useCallback(() => {
    setLevelIndex((current) => Math.min(levels.length - 1, current + 1));
  }, [levels.length]);

  const zoomOut = useCallback(() => {
    setLevelIndex((current) => Math.max(0, current - 1));
  }, []);

  useEffect(() => {
    const node = surfaceRef.current;
    if (!node || levels.length <= 1) return;

    const commitPinch = () => {
      if (pinchStartDist.current == null || pinchLatestDist.current == null) return;
      const ratio = pinchLatestDist.current / pinchStartDist.current;
      if (ratio > 1.12) setLevelIndex((current) => Math.max(0, current - 1));
      else if (ratio < 0.88) setLevelIndex((current) => Math.min(levels.length - 1, current + 1));
      pinchStartDist.current = null;
      pinchLatestDist.current = null;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      pinchStartDist.current = touchDistance(event.touches);
      pinchLatestDist.current = pinchStartDist.current;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || pinchStartDist.current == null) return;
      event.preventDefault();
      pinchLatestDist.current = touchDistance(event.touches);
    };

    const onTouchEnd = () => {
      commitPinch();
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (wheelCooldown.current) return;
      wheelCooldown.current = true;
      window.setTimeout(() => {
        wheelCooldown.current = false;
      }, 180);
      if (event.deltaY < 0) setLevelIndex((current) => Math.min(levels.length - 1, current + 1));
      else if (event.deltaY > 0) setLevelIndex((current) => Math.max(0, current - 1));
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd, { passive: true });
    node.addEventListener("touchcancel", onTouchEnd, { passive: true });
    node.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
      node.removeEventListener("wheel", onWheel);
    };
  }, [levels.length]);

  const level = levels[levelIndex] ?? levels[levels.length - 1];

  return {
    data: level.data,
    level,
    levelIndex,
    surfaceRef,
    canZoomIn: levelIndex < levels.length - 1,
    canZoomOut: levelIndex > 0,
    zoomIn,
    zoomOut,
  };
}
