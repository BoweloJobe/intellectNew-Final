import { GlassCard } from "../GlassCard";
import { Skeleton } from "../ui/skeleton";

export function DiscussionCardSkeleton() {
  return (
    <GlassCard className="pointer-events-none">
      <div className="flex gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />

        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-4/5" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export function CourseCardSkeleton() {
  return (
    <GlassCard className="pointer-events-none flex flex-col">
      <div className="mb-4">
        <Skeleton className="mb-4 h-32 w-full rounded-xl" />
        <Skeleton className="mb-2 h-6 w-3/4" />
        <Skeleton className="mb-4 h-4 w-1/2" />

        <div className="mb-4 flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>

        <Skeleton className="mb-4 h-4 w-14" />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      <Skeleton className="mt-auto h-9 w-full rounded-md" />
    </GlassCard>
  );
}

export function DashboardWidgetSkeleton() {
  return (
    <GlassCard className="pointer-events-none">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-14" />
        </div>
      </div>
    </GlassCard>
  );
}

export function SectionPanelSkeleton() {
  return (
    <GlassCard className="pointer-events-none">
      <Skeleton className="mb-6 h-6 w-40" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </GlassCard>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="rounded-xl border border-white/50 bg-white/[0.45] p-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
