import { BookOpen, FileText, Search, Video } from "lucide-react";
import type { ReactNode } from "react";
import { DataErrorState } from "./DataState";
import { EmptyState } from "./EmptyState";
import { Input } from "./ui/input";
import {
  type GlobalSearchItem,
  type GlobalSearchItemType,
  MIN_GLOBAL_SEARCH_QUERY_LENGTH,
} from "../utils/search";

function getSearchTypeLabel(type: GlobalSearchItemType): string {
  if (type === "course") return "Course";
  if (type === "lesson") return "Lesson";
  if (type === "quiz") return "Quiz";
  return "Note";
}

function getSearchTypeIcon(type: GlobalSearchItemType): ReactNode {
  if (type === "course") return <BookOpen className="h-3.5 w-3.5" />;
  if (type === "lesson") return <Video className="h-3.5 w-3.5" />;
  if (type === "quiz") return <Search className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

interface SearchResultButtonProps {
  item: GlobalSearchItem;
  onNavigate: (item: GlobalSearchItem) => void;
}

function SearchResultButton({ item, onNavigate }: SearchResultButtonProps) {
  return (
    <button
      type="button"
      className="w-full rounded-xl border border-white/50 bg-white/[0.5] px-3 py-2 text-left transition-colors hover:bg-white/[0.72]"
      onClick={() => {
        onNavigate(item);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#4a9ff5]/10 px-2 py-0.5 text-[11px] font-semibold text-[#4a9ff5]">
          {getSearchTypeIcon(item.type)}
          {getSearchTypeLabel(item.type)}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-gray-600">{item.subtitle}</p>
    </button>
  );
}

export interface GlobalSearchDropdownProps {
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  results: GlobalSearchItem[];
  suggestions: GlobalSearchItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onNavigate: (item: GlobalSearchItem) => void;
  mobileInputRef?: React.RefObject<HTMLInputElement>;
}

export function GlobalSearchDropdown({
  query,
  onQueryChange,
  onClose,
  results,
  suggestions,
  isLoading,
  error,
  onRetry,
  onNavigate,
  mobileInputRef,
}: GlobalSearchDropdownProps) {
  const trimmedQuery = query.trim();

  return (
    <div
      role="dialog"
      aria-label="Global search"
      className="absolute right-0 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/70 bg-white/80 p-3 shadow-2xl backdrop-blur-xl"
      style={{ boxShadow: "0 12px 35px rgba(0, 0, 0, 0.12)" }}
    >
      {/* Mobile-only inline input */}
      <div className="mb-3 md:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            ref={mobileInputRef}
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Search..."
            className="h-9 rounded-lg border-white/70 bg-white/[0.55] pl-9 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={`global-search-loading-${index}`}
              className="rounded-xl border border-white/50 bg-white/[0.45] p-3"
            >
              <div className="mb-2 h-3 w-2/3 rounded bg-white/80" />
              <div className="h-3 w-1/2 rounded bg-white/70" />
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && error ? (
        <DataErrorState
          title="Search unavailable"
          description={error}
          retryLabel="Retry"
          onRetry={onRetry}
        />
      ) : null}

      {!isLoading && !error && trimmedQuery.length === 0 ? (
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Suggested
          </p>
          {suggestions.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Start searching"
              description="Search courses, lessons, quizzes, and notes from anywhere."
              className="px-4 py-6"
            />
          ) : (
            suggestions.map((item) => (
              <SearchResultButton key={item.id} item={item} onNavigate={onNavigate} />
            ))
          )}
        </div>
      ) : null}

      {!isLoading && !error && trimmedQuery.length > 0 && results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching results"
          description={
            trimmedQuery.length < MIN_GLOBAL_SEARCH_QUERY_LENGTH
              ? "Type at least 2 characters to search."
              : "Try a clearer keyword like course name, lesson title, or topic."
          }
          className="px-4 py-6"
        />
      ) : null}

      {!isLoading && !error && trimmedQuery.length > 0 && results.length > 0 ? (
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Results
          </p>
          {results.map((item) => (
            <SearchResultButton key={item.id} item={item} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
