import { useEffect, useState } from "react";

/**
 * Ids that appeared since the previous `items` value (not on first render).
 * Cleared after `ms`, so a newly injected alert can animate in and stay
 * highlighted briefly.
 */
export function useFreshIds<T extends { id: string }>(items: T[], ms = 2500): Set<string> {
  const [prevItems, setPrevItems] = useState(items);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());

  // Derive during render (React's "store info from previous renders" pattern)
  // so the card mounts already carrying its animation class.
  if (items !== prevItems) {
    const before = new Set(prevItems.map((i) => i.id));
    setFresh(new Set(items.filter((i) => !before.has(i.id)).map((i) => i.id)));
    setPrevItems(items);
  }

  useEffect(() => {
    if (fresh.size === 0) return;
    const t = setTimeout(() => setFresh(new Set()), ms);
    return () => clearTimeout(t);
  }, [fresh, ms]);

  return fresh;
}
