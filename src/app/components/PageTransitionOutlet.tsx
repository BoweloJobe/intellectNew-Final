import { useEffect, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";

function isLessonRoute(pathname: string): boolean {
  return /^\/courses\/[^/]+\/lessons\/[^/]+$/.test(pathname);
}

function shouldDeferRouteSwap(previousPathname: string, nextPathname: string): boolean {
  if (isLessonRoute(previousPathname) && isLessonRoute(nextPathname)) {
    return false;
  }

  return true;
}

/**
 * PageTransitionOutlet - stable route wrapper without fading page content.
 *
 * Route content always renders at full opacity. The stable outer wrapper
 * preserves shell sizing without making cards, text, or page backgrounds
 * look transparent during navigation.
 */
export function PageTransitionOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const [currNode, setCurrNode] = useState<React.ReactNode>(outlet);

  const prevKeyRef = useRef(location.key);
  const prevPathRef = useRef(location.pathname);
  const raf = useRef(0);

  useEffect(() => {
    if (location.key === prevKeyRef.current) return;

    const previousPathname = prevPathRef.current;
    const nextPathname = location.pathname;

    prevKeyRef.current = location.key;
    prevPathRef.current = nextPathname;

    cancelAnimationFrame(raf.current);

    if (!shouldDeferRouteSwap(previousPathname, nextPathname)) {
      setCurrNode(outlet);
      return;
    }

    raf.current = requestAnimationFrame(() => {
      setCurrNode(outlet);
    });

    return () => cancelAnimationFrame(raf.current);
  }, [location.key, location.pathname, outlet]);

  return (
    <div
      className="relative isolate w-full min-w-0 overflow-x-clip"
      style={{
        contain: "paint",
        minHeight: "calc(100vh - var(--ix-navbar-offset, 7.5rem))",
      }}
    >
      {currNode}
    </div>
  );
}
