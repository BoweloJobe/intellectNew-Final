import { type ComponentPropsWithoutRef, type ReactNode } from "react";

interface SolidCardProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

/**
 * SolidCard - Secondary surface layer
 * 
 * Used for:
 * - Individual items within cards (course cards, quiz items, discussion posts)
 * - Secondary content panels
 * - List items and secondary information containers
 * 
 * Provides subtle elevation with soft solid backgrounds, not glass.
 * Part of visual hierarchy to distinguish from primary GlassCard surfaces.
 */
export function SolidCard({ children, className = "", hover = false, ...rest }: SolidCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        hover
          ? "transition-[transform,box-shadow] duration-200 ease-out hover:shadow-md hover:-translate-y-[1px] motion-reduce:transition-none motion-reduce:hover:translate-y-0 cursor-pointer"
          : ""
      } ${className}`}
      style={{
        background: "var(--surface-overlay-1)",
        borderColor: "var(--surface-overlay-border)",
        boxShadow: "var(--surface-overlay-shadow)",
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
