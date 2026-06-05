import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export type ListOption = {
  value: string;
  label: string;
};

interface ListControlsProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: ListOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  sortOptions?: ListOption[];
  onClear?: () => void;
  resultCount?: number;
  className?: string;
}

export function ListControls({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterValue,
  onFilterChange,
  filterOptions,
  sortValue,
  onSortChange,
  sortOptions,
  onClear,
  resultCount,
  className = "",
}: ListControlsProps) {
  const hasFilter = Boolean(filterOptions && onFilterChange && filterValue !== undefined);
  const hasSort = Boolean(sortOptions && onSortChange && sortValue !== undefined);

  return (
    <div className={["space-y-3", className].join(" ")}>
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            value={searchValue}
            onChange={(event) => {
              onSearchChange(event.target.value);
            }}
            placeholder={searchPlaceholder}
            className="bg-white/[0.45] pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasFilter ? (
            <select
              value={filterValue}
              onChange={(event) => {
                onFilterChange?.(event.target.value);
              }}
              className="h-10 rounded-md border border-white/50 bg-white/[0.55] px-3 text-sm text-gray-700 outline-none transition focus:ring-2 focus:ring-[#4a9ff5]/30"
            >
              {filterOptions?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}

          {hasSort ? (
            <select
              value={sortValue}
              onChange={(event) => {
                onSortChange?.(event.target.value);
              }}
              className="h-10 rounded-md border border-white/50 bg-white/[0.55] px-3 text-sm text-gray-700 outline-none transition focus:ring-2 focus:ring-[#4a9ff5]/30"
            >
              {sortOptions?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : null}

          {onClear ? (
            <Button type="button" variant="outline" className="bg-white/[0.55]" onClick={onClear}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {typeof resultCount === "number" ? (
        <p className="text-xs text-gray-500">
          Showing {resultCount} result{resultCount === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

interface LoadMoreFooterProps {
  shownCount: number;
  totalCount: number;
  onLoadMore: () => void;
  incrementLabel?: string;
}

export function LoadMoreFooter({
  shownCount,
  totalCount,
  onLoadMore,
  incrementLabel = "Load more",
}: LoadMoreFooterProps) {
  if (shownCount >= totalCount) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <p className="text-xs text-gray-500">
        Showing {shownCount} of {totalCount}
      </p>
      <Button type="button" variant="outline" className="bg-white/[0.55]" onClick={onLoadMore}>
        {incrementLabel}
      </Button>
    </div>
  );
}
