import { PageTransitionOutlet } from "../components/PageTransitionOutlet";
import { AppErrorBoundary } from "../components/error/AppErrorBoundary";
import { Link, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";

export function Layout() {
  const location = useLocation();

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-background">
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
            select-none transition-[opacity,filter] duration-300 ease-out dark:opacity-35 dark:brightness-75 dark:saturate-75
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
      <div className="relative z-10 flex min-h-screen w-full min-w-0 flex-col">
        <Navbar />
        <main className="relative w-full min-w-0 flex-1 overflow-x-clip pt-28">
          <AppErrorBoundary area="page content" className="py-16" resetKeys={[location.key]}>
            <PageTransitionOutlet />
          </AppErrorBoundary>
        </main>
        <footer className="border-t border-border/50 bg-background/75 px-4 py-6 text-sm text-muted-foreground backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>(c) 2026 IntellectX. Draft legal documents pending review.</p>
            <nav className="flex gap-4" aria-label="Legal">
              <Link to="/terms" className="font-medium text-foreground hover:text-[#4a9ff5]">
                Terms
              </Link>
              <Link to="/privacy" className="font-medium text-foreground hover:text-[#4a9ff5]">
                Privacy
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
