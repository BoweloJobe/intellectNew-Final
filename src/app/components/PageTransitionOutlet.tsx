import { useEffect, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";

const EXIT_MS = 160;
const ENTER_MS = 220;

function isLessonRoute(pathname: string): boolean {
  return /^\/courses\/\d+\/lessons\/[^/]+$/.test(pathname);
}

function shouldAnimateRouteTransition(previousPathname: string, nextPathname: string): boolean {
  if (isLessonRoute(previousPathname) && isLessonRoute(nextPathname)) {
    return false;
  }

  return true;
}

/**
 * PageTransitionOutlet - Smooth page transitions with stable background
 *
 * STRATEGY: Dual-layer with rAF-triggered CSS transitions
 * - Exit layer: old page starts visible, rAF flips state → CSS fades it out + slides up slightly
 * - Enter layer: new page starts hidden below, rAF flips state → CSS fades in + slides up
 * - Both layers overlap during crossfade → background never shows through
 * - Background layer (in Layout) is never touched
 */
export function PageTransitionOutlet() {
  const location = useLocation();
  const outlet = useOutlet();

  // Ref holds what is currently visible on screen (for snapshotting on route change)
  const displayedRef = useRef<React.ReactNode>(outlet);

  // Exit layer
  const [prevNode, setPrevNode] = useState<React.ReactNode>(null);
  const [prevVisible, setPrevVisible] = useState(false);

  // Enter layer
  const [currNode, setCurrNode] = useState<React.ReactNode>(outlet);
  const [currVisible, setCurrVisible] = useState(false);

  const prevKeyRef = useRef(location.key);
  const prevPathRef = useRef(location.pathname);
  const raf1 = useRef(0);
  const raf2 = useRef(0);
  const timer = useRef(0);

  // Initial mount: fade in first page
  useEffect(() => {
    raf1.current = requestAnimationFrame(() => setCurrVisible(true));
    return () => cancelAnimationFrame(raf1.current);
  }, []);

  useEffect(() => {
    if (location.key === prevKeyRef.current) return;

    const previousPathname = prevPathRef.current;
    const nextPathname = location.pathname;

    prevKeyRef.current = location.key;
    prevPathRef.current = nextPathname;

    // Cancel any in-flight animation
    cancelAnimationFrame(raf1.current);
    cancelAnimationFrame(raf2.current);
    clearTimeout(timer.current);

    if (!shouldAnimateRouteTransition(previousPathname, nextPathname)) {
      displayedRef.current = outlet;
      setPrevNode(null);
      setPrevVisible(false);
      setCurrNode(outlet);
      setCurrVisible(true);
      return;
    }

    // Snapshot old content and stage exit layer (visible)
    const snapshot = displayedRef.current;
    displayedRef.current = outlet;

    setPrevNode(snapshot);
    setPrevVisible(true);

    // Stage new content in enter layer (hidden, offset below)
    setCurrNode(outlet);
    setCurrVisible(false);

    // Next paint: trigger both animations simultaneously
    raf1.current = requestAnimationFrame(() => {
      setPrevVisible(false); // exit: fade out + slide up slightly

      raf2.current = requestAnimationFrame(() => {
        setCurrVisible(true); // enter: fade in + slide up from below
      });

      // Remove exit layer once its animation is done
      timer.current = window.setTimeout(() => {
        setPrevNode(null);
      }, EXIT_MS + 50);
    });
  }, [location.key, location.pathname, outlet]);

  return (
    <div className="relative">
      {/* Exit layer — old page fades out and nudges up */}
      {prevNode && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transition: `opacity ${EXIT_MS}ms ease-in, transform ${EXIT_MS}ms ease-in`,
            opacity: prevVisible ? 1 : 0,
            transform: prevVisible ? "translateY(0)" : "translateY(-6px)",
          }}
        >
          {prevNode}
        </div>
      )}

      {/* Enter layer — new page slides up from below and fades in */}
      <div
        style={{
          transition: `opacity ${ENTER_MS}ms ease-out, transform ${ENTER_MS}ms ease-out`,
          opacity: currVisible ? 1 : 0,
          transform: currVisible ? "translateY(0)" : "translateY(16px)",
        }}
      >
        {currNode}
      </div>
    </div>
  );
}
