"use client";

import type React from "react";
import { useCallback, useMemo, useRef } from "react";
import PluginModal from "./PluginModal";
import type { TrackPlugin } from "./pluginTypes";

export type PluginWindowPosition = { x: number; y: number };

type PluginWindowProps = {
  windowId: string;
  plugin: TrackPlugin;
  position: PluginWindowPosition;
  zIndex: number;
  onPositionChange: (pos: PluginWindowPosition) => void;
  onFocus: () => void;
  onChange: (plugin: TrackPlugin) => void;
  onClose: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function PluginWindow({
  windowId,
  plugin,
  position,
  zIndex,
  onPositionChange,
  onFocus,
  onChange,
  onClose,
}: PluginWindowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<
    | {
        pointerId: number;
        startClientX: number;
        startClientY: number;
        startX: number;
        startY: number;
      }
    | null
  >(null);

  const style = useMemo(
    () => ({
      left: `${position.x}px`,
      top: `${position.y}px`,
      zIndex,
    }),
    [position.x, position.y, zIndex],
  );

  const beginDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (target && target.closest("button,select,input,textarea,a,[data-no-drag]")) {
        return;
      }
      onFocus();
      dragRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: position.x,
        startY: position.y,
      };
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // no-op
      }
      event.preventDefault();
    },
    [onFocus, position.x, position.y],
  );

  const onDragMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (event.pointerId !== drag.pointerId) return;

      const dx = event.clientX - drag.startClientX;
      const dy = event.clientY - drag.startClientY;
      const nextRaw = { x: drag.startX + dx, y: drag.startY + dy };

      const margin = 8;
      const rect = containerRef.current?.getBoundingClientRect();
      const w = rect?.width ?? 760;
      const h = rect?.height ?? 520;
      const maxX = Math.max(margin, window.innerWidth - w - margin);
      const maxY = Math.max(margin, window.innerHeight - h - margin);

      const next = {
        x: clamp(nextRaw.x, margin, maxX),
        y: clamp(nextRaw.y, margin, maxY),
      };

      onPositionChange(next);
    },
    [onPositionChange],
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="mixsmvrt-plugin-window fixed"
      style={style}
      onPointerDownCapture={onFocus}
      data-window-id={windowId}
    >
      <PluginModal
        plugin={plugin}
        onChange={onChange}
        onClose={onClose}
        shellClassName="shadow-[0_0_70px_rgba(0,0,0,0.85)]"
        onHeaderPointerDown={beginDrag}
        onHeaderPointerMove={onDragMove}
        onHeaderPointerUp={endDrag}
        onHeaderPointerCancel={endDrag}
      />
    </div>
  );
}
