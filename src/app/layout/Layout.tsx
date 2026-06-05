import { PageTransitionOutlet } from "../components/PageTransitionOutlet";
import { AppErrorBoundary } from "../components/error/AppErrorBoundary";
import { useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";

export function Layout() {
  const location = useLocation();

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[#f5f5f5]">
      {/*
        Decorative DNA composition layer.
        - Fixed so it does not scroll with the page
        - z-0 keeps it behind all UI content (content sits at z-10)
        - Pointer events off so clicks pass straight through
        - Positioned bottom-right so the left / centre stays clean for UI
        - Hidden on small screens to keep mobile uncluttered
      */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/brain-bg.jpg"
          alt=""
          aria-hidden="true"
          className="
            hidden sm:block
            absolute inset-0
            w-full h-full object-cover
            select-none
          "
        />
      </div>

      {/* 
        Main content wrapper - always above background
        ✓ z-10 ensures it stacks above fixed background (z-0)
        ✓ relative positioning creates new stacking context
        ✓ min-h-screen prevents gaps below content
        ✓ PageTransitionOutlet ensures smooth transitions without background visibility
      */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <AppErrorBoundary area="page content" className="py-16" resetKeys={[location.key]}>
            <PageTransitionOutlet />
          </AppErrorBoundary>
        </main>
      </div>
    </div>
  );
}
