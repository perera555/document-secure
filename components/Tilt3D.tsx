"use client";

import { useRef, type ReactNode } from "react";

/**
 * 3D tilt wrapper: the card follows the pointer/finger with perspective,
 * a moving light shine, and children can float above it with `.layer-*` classes.
 */
export function Tilt3D({
  children,
  className = "",
  max = 12,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${(0.5 - y) * max * 2}deg`);
      el.style.setProperty("--ry", `${(x - 0.5) * max * 2}deg`);
      el.style.setProperty("--gx", `${x * 100}%`);
      el.style.setProperty("--gy", `${y * 100}%`);
      el.dataset.active = "1";
    });
  }

  function leave() {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    delete el.dataset.active;
  }

  return (
    <div className={`tilt-scene ${className}`} onPointerMove={move} onPointerLeave={leave} onPointerCancel={leave} onPointerUp={(e) => e.pointerType !== "mouse" && leave()}>
      <div ref={ref} className="tilt-card">
        {children}
        {glare && <div className="tilt-glare" aria-hidden />}
      </div>
    </div>
  );
}
