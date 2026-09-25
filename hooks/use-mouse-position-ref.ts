"use client";

import { RefObject, useEffect, useRef } from "react";

export function useMousePositionRef(
  containerRef?: RefObject<HTMLElement | null>,
) {
  const positionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function updatePosition(x: number, y: number) {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        positionRef.current = {
          x: x - rect.left - rect.width / 2,
          y: y - rect.top - rect.height / 2,
        };
      } else {
        positionRef.current = { x, y };
      }
    }

    function handleMouseMove(event: MouseEvent) {
      updatePosition(event.clientX, event.clientY);
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      updatePosition(touch.clientX, touch.clientY);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [containerRef]);

  return positionRef;
}
