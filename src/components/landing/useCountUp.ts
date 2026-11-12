import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

/**
 * Count from 0 to `target` over `ms` on first mount (requestAnimationFrame, ease-out).
 * Later changes (inject / act / reset) show the new value immediately. With
 * prefers-reduced-motion: reduce, the final value renders straight away.
 */
export function useCountUp(target: number, ms = 700): number {
  const [reduced] = useState(prefersReducedMotion);
  const [value, setValue] = useState(() => (reduced ? target : 0));
  const done = useRef(reduced);

  useEffect(() => {
    if (done.current) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else done.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return value;
}
