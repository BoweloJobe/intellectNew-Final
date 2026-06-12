import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Moon, Search, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { getDefaultPathForRole } from "../auth/route-utils";
import { EmptyState } from "../components/EmptyState";
import { GlobalSearchDropdown } from "../components/GlobalSearchDropdown";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { ListControls, LoadMoreFooter, type ListOption } from "../components/ListControls";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useNotificationsState } from "../state/notifications/NotificationsStateContext";
import { useAuth } from "../auth/AuthContext";
import {
  type GlobalSearchItem,
  buildSearchCatalog,
  getSuggestedItems,
  invalidateSearchCatalog,
  rankSearchResults,
} from "../utils/search";

type NotificationFilter = "all" | "unread" | "read" | "quiz" | "course" | "community" | "achievement" | "ai";
type NotificationSort = "newest" | "oldest";
type NotificationGroupMode = "recency" | "type";

export function shouldShowAuthenticatedNav(isAuthenticated: boolean, isAuthRestoring: boolean): boolean {
  return isAuthenticated && !isAuthRestoring;
}

export function getNavbarLinks(role: string | null, isAuthenticated: boolean) {
  if (!isAuthenticated) {
    return [];
  }

  if (role === "instructor") {
    return [
      { name: "Dashboard", path: "/instructor" },
      { name: "My Courses", path: "/instructor/courses" },
      { name: "Quizzes", path: "/instructor/quizzes/new" },
      { name: "Community", path: "/community" },
    ];
  }

  if (role === "admin") {
    return [
      { name: "Admin", path: "/admin" },
      { name: "Courses", path: "/courses" },
      { name: "Community", path: "/community" },
    ];
  }

  return [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Courses", path: "/courses" },
    { name: "Learn", path: "/courses" },
    { name: "Quizzes", path: "/quizzes" },
    { name: "Progress", path: "/progress" },
    { name: "Community", path: "/community" },
    { name: "Pricing", path: "/pricing" },
  ];
}

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, isAuthenticated, loading: isAuthRestoring, signOut } = useAuth();
  const showAuthenticatedNav = shouldShowAuthenticatedNav(isAuthenticated, isAuthRestoring);
  const {
    state: { notifications },
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    unreadNotificationCount,
    notificationsByRecency,
    notificationsByType,
  } = useNotificationsState();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const {
    viewState: notificationsState,
    errorMessage: notificationsError,
    run: runLoadNotifications,
  } = useAsyncViewState({
    defaultErrorMessage: "Unable to fetch notifications right now.",
  });
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null);
  const [notificationQuery, setNotificationQuery] = useState("");
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>("all");
  const [notificationSort, setNotificationSort] = useState<NotificationSort>("newest");
  const [notificationGroupMode, setNotificationGroupMode] = useState<NotificationGroupMode>("recency");
  const [notificationVisibleCount, setNotificationVisibleCount] = useState(3);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState<string | null>(null);
  const [globalSearchItems, setGlobalSearchItems] = useState<GlobalSearchItem[]>([]);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationToggleRef = useRef<HTMLButtonElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const globalSearchRef = useRef<HTMLDivElement | null>(null);
  const globalSearchInputRef = useRef<HTMLInputElement | null>(null);
  const homeRoute = showAuthenticatedNav ? getDefaultPathForRole(role) : "/";
  const navLinks = getNavbarLinks(role, showAuthenticatedNav);

  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const hasUnreadNotifications = unreadNotificationCount > 0;

  const loadGlobalSearchCatalog = async () => {
    if (isGlobalSearchLoading || globalSearchItems.length > 0) {
      return;
    }

    setIsGlobalSearchLoading(true);
    setGlobalSearchError(null);

    try {
      const catalog = await buildSearchCatalog();
      setGlobalSearchItems(catalog);
    } catch {
      setGlobalSearchError("Search is unavailable right now. Please try again.");
    } finally {
      setIsGlobalSearchLoading(false);
    }
  };

  const filterOptions: ListOption[] = [
    { value: "all", label: "All Notifications" },
    { value: "unread", label: "Unread" },
    { value: "read", label: "Read" },
    { value: "quiz", label: "Quiz" },
    { value: "course", label: "Course" },
    { value: "community", label: "Community" },
    { value: "achievement", label: "Achievement" },
    { value: "ai", label: "AI Tutor" },
  ];

  const sortOptions: ListOption[] = [
    { value: "newest", label: "Sort: Newest" },
    { value: "oldest", label: "Sort: Oldest" },
  ];

  const filteredNotifications = useMemo(() => {
    const query = notificationQuery.trim().toLowerCase();

    const searched = notifications.filter((item) => {
      if (!query) {
        return true;
      }

      return item.title.toLowerCase().includes(query) || item.detail.toLowerCase().includes(query);
    });

    const filtered = searched.filter((item) => {
      if (notificationFilter === "all") {
        return true;
      }

      if (notificationFilter === "unread") {
        return !item.read;
      }

      if (notificationFilter === "read") {
        return item.read;
      }

      return item.category === notificationFilter;
    });

    return [...filtered].sort((left, right) => {
      if (notificationSort === "newest") {
        return left.minutesAgo - right.minutesAgo;
      }

      return right.minutesAgo - left.minutesAgo;
    });
  }, [notificationFilter, notificationQuery, notificationSort, notifications]);

  const visibleNotifications = filteredNotifications.slice(0, notificationVisibleCount);
  const groupedNotifications = notificationGroupMode === "recency" ? notificationsByRecency : notificationsByType;
  const groupedVisibleNotifications = groupedNotifications
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => visibleNotifications.some((visible) => visible.id === item.id)),
    }))
    .filter((group) => group.items.length > 0);

  const hasActiveNotificationFilters =
    notificationQuery.trim().length > 0 || notificationFilter !== "all" || notificationSort !== "newest";

  const globalSearchResults = useMemo(
    () => rankSearchResults(globalSearchItems, globalSearchQuery),
    [globalSearchItems, globalSearchQuery],
  );

  const suggestedSearchItems = useMemo(
    () => getSuggestedItems(globalSearchItems),
    [globalSearchItems],
  );

  const clearNotificationControls = () => {
    setNotificationQuery("");
    setNotificationFilter("all");
    setNotificationSort("newest");
    setNotificationGroupMode("recency");
  };

  const handleGlobalSearchNavigate = (item: GlobalSearchItem) => {
    setIsGlobalSearchOpen(false);
    navigate(item.to);
  };

  const isNavLinkActive = (path: string, name: string) => {
    if (name === "Dashboard") {
      return location.pathname === path;
    }

    if (name === "Learn") {
      return location.pathname === "/learn" || location.pathname.startsWith("/learn/");
    }

    if (name === "Courses") {
      return location.pathname === "/courses" || location.pathname.startsWith("/courses/");
    }

    // Exact match for /instructor so it doesn't stay highlighted when on /instructor/courses
    if (path === "/instructor") {
      return location.pathname === "/instructor";
    }

    return location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
  };

  const getNotificationDestination = (notificationId: string) => {
    const notification = notifications.find((item) => item.id === notificationId);

    if (!notification) {
      return null;
    }

    switch (notification.source) {
      case "quiz-reminder":
        return { to: "/quizzes" };
      case "course-update":
        return { to: notification.metadata?.courseId ? `/courses/${notification.metadata.courseId}` : "/courses" };
      case "badge-earned":
        return { to: "/progress" };
      case "community-reply":
        return { to: "/community" };
      case "ai-tutor-recommendation":
        return {
          to: "/ai-tutor",
          state: notification.metadata?.suggestionTopic
            ? { contextPrompt: `Help me review ${notification.metadata.suggestionTopic}.` }
            : undefined,
        };
      default:
        return null;
    }
  };

  const handleNotificationAction = (notificationId: string, navigateToDestination = false) => {
    markNotificationRead(notificationId);

    if (!navigateToDestination) {
      return;
    }

    const destination = getNotificationDestination(notificationId);

    if (!destination) {
      return;
    }

    setIsNotificationsOpen(false);
    navigate(destination.to, destination.state ? { state: destination.state } : undefined);
  };

  useEffect(() => {
    setNotificationVisibleCount(3);
  }, [notificationFilter, notificationQuery, notificationSort]);

  const loadNotifications = () => {
    void runLoadNotifications(async () => {
      await new Promise<void>((resolve) => {
        window.setTimeout(() => {
          resolve();
        }, 450);
      });

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("Unable to fetch notifications right now.");
      }

      return true;
    });
  };

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    loadNotifications();
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!showAuthenticatedNav || !isGlobalSearchOpen) {
      return;
    }

    void loadGlobalSearchCatalog();
  }, [showAuthenticatedNav, isGlobalSearchOpen]);

  useEffect(() => {
    if (!isGlobalSearchOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!globalSearchRef.current) {
        return;
      }

      if (!globalSearchRef.current.contains(event.target as Node)) {
        setIsGlobalSearchOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isGlobalSearchOpen]);

  useEffect(() => {
    setIsGlobalSearchOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isProfileOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!profileRef.current) {
        return;
      }

      if (!profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!notificationsRef.current) {
        return;
      }

      if (!notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsNotificationsOpen(false);
      notificationToggleRef.current?.focus();
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isNotificationsOpen]);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 mx-4 mt-4">
      <div
        className="mx-auto max-w-7xl rounded-[28px] border border-border/40 bg-background/70 px-2.5 py-2 shadow-[0_12px_34px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl dark:shadow-[0_18px_42px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)]"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Brand */}
          <Link
            to={homeRoute}
            className="flex h-9 shrink-0 items-center gap-2.5 rounded-2xl px-2.5 transition-colors duration-200 ease-out hover:bg-popover/70 focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-[#4a9ff5]/30"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#4a9ff5]/10">
              <span
                className="text-[#4a9ff5] font-semibold text-[10px] tracking-[0.12em]"
                style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}
              >
                IX
              </span>
            </div>
            <span
              className="text-[1.06rem] font-semibold text-foreground tracking-[-0.01em]"
              style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}
            >
              intellectX
            </span>
          </Link>

          {/* Navigation Links - Only show when logged in */}
          {showAuthenticatedNav && (
            <div className="hidden lg:inline-flex h-10 w-fit shrink-0 items-center justify-center rounded-2xl border border-border/40 bg-surface-overlay-2/80 p-1 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-colors duration-200 ease-out">
              {navLinks.map((link) => {
                const isActive = isNavLinkActive(link.path, link.name);
                return (
                  <Link
                    key={`${link.name}-${link.path}`}
                    to={link.path}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-transparent px-4 py-1 text-base font-medium transition-[color,background-color,box-shadow] duration-200 ease-out focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-[#4a9ff5]/30",
                      "after:absolute after:bottom-[2px] after:left-3 after:right-3 after:h-[2px] after:origin-center after:scale-x-0 after:rounded-full after:bg-[#4a9ff5] after:transition-transform after:duration-200 after:ease-out",
                      isActive
                        ? "bg-card/90 text-foreground shadow-sm after:scale-x-100"
                        : "text-muted-foreground hover:bg-surface-overlay-1/90 hover:text-foreground",
                    ].join(" ")}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right Section */}
          <div className="flex shrink-0 items-center gap-1.5">
            {showAuthenticatedNav ? (
              <>
                <div className="relative" ref={globalSearchRef}>
                  <button
                    type="button"
                    className="rounded-2xl p-2 transition-colors duration-200 ease-out hover:bg-surface-overlay-1/75 focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-[#4a9ff5]/30 xl:hidden"
                    aria-label="Open global search"
                    onClick={() => {
                      setIsGlobalSearchOpen((previous) => !previous);
                      window.setTimeout(() => {
                        globalSearchInputRef.current?.focus();
                      }, 0);
                    }}
                  >
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </button>

                  <div className="hidden xl:block">
                    <div className="relative w-52">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={globalSearchQuery}
                        onFocus={() => {
                          setIsGlobalSearchOpen(true);
                        }}
                        onChange={(event) => {
                          setGlobalSearchQuery(event.target.value);
                          if (!isGlobalSearchOpen) {
                            setIsGlobalSearchOpen(true);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setIsGlobalSearchOpen(false);
                          }

                          if (event.key === "Enter" && globalSearchResults.length > 0) {
                            event.preventDefault();
                            handleGlobalSearchNavigate(globalSearchResults[0]);
                          }
                        }}
                        placeholder="Search..."
                        className="h-9 rounded-2xl border-border/50 bg-input-background/80 pl-9 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-colors duration-200 ease-out placeholder:text-muted-foreground focus-visible:ring-[#4a9ff5]/30"
                      />
                    </div>
                  </div>

                  {isGlobalSearchOpen ? (
                    <GlobalSearchDropdown
                      query={globalSearchQuery}
                      onQueryChange={(value) => {
                        setGlobalSearchQuery(value);
                      }}
                      onClose={() => {
                        setIsGlobalSearchOpen(false);
                      }}
                      results={globalSearchResults}
                      suggestions={suggestedSearchItems}
                      isLoading={isGlobalSearchLoading}
                      error={globalSearchError}
                      onRetry={() => {
                        invalidateSearchCatalog();
                        setGlobalSearchItems([]);
                        void loadGlobalSearchCatalog();
                      }}
                      onNavigate={handleGlobalSearchNavigate}
                      mobileInputRef={globalSearchInputRef}
                    />
                  ) : null}
                </div>

                {/* Notifications */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    ref={notificationToggleRef}
                    type="button"
                    className="relative rounded-2xl p-2 transition-colors duration-200 ease-out hover:bg-surface-overlay-1/75 focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-[#4a9ff5]/30"
                    onClick={() => {
                      setIsNotificationsOpen((previous) => !previous);
                    }}
                    aria-label="Toggle notifications"
                    aria-expanded={isNotificationsOpen}
                    aria-haspopup="dialog"
                  >
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    {hasUnreadNotifications ? (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                    ) : null}
                  </button>

                  {isNotificationsOpen ? (
                    <div
                      role="dialog"
                      aria-label="Notifications panel"
                      className="absolute right-0 mt-3 w-[22rem] max-h-[75vh] overflow-y-auto overscroll-contain rounded-2xl border border-border/70 bg-popover/80 p-4 shadow-2xl backdrop-blur-xl"
                      style={{ boxShadow: "0 12px 35px rgba(0, 0, 0, 0.12)" }}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">Notifications</h4>
                          <p className="text-xs text-muted-foreground">{unreadNotificationCount} unread</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary"
                          disabled={notifications.length === 0 || notificationsState !== "success"}
                          onClick={() => {
                            markAllNotificationsRead();
                            setNotificationSuccess("All notifications marked as read.");
                            window.setTimeout(() => {
                              setNotificationSuccess(null);
                            }, 2000);
                          }}
                        >
                          Mark all read
                        </Button>
                      </div>

                      {notificationSuccess ? (
                        <ActionSuccessState message={notificationSuccess} className="mb-3" />
                      ) : null}

                      {notificationsState === "success" ? (
                        <div className="mb-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={`px-3 py-1 rounded-full text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                notificationGroupMode === "recency"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card/80 text-muted-foreground"
                              }`}
                              onClick={() => {
                                setNotificationGroupMode("recency");
                              }}
                            >
                              Grouped by recency
                            </button>
                            <button
                              type="button"
                              className={`px-3 py-1 rounded-full text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                notificationGroupMode === "type"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-card/80 text-muted-foreground"
                              }`}
                              onClick={() => {
                                setNotificationGroupMode("type");
                              }}
                            >
                              Grouped by type
                            </button>
                          </div>
                          <ListControls
                            searchValue={notificationQuery}
                            onSearchChange={setNotificationQuery}
                            searchPlaceholder="Search notifications"
                            filterValue={notificationFilter}
                            onFilterChange={(value) => {
                              setNotificationFilter(value as NotificationFilter);
                            }}
                            filterOptions={filterOptions}
                            sortValue={notificationSort}
                            onSortChange={(value) => {
                              setNotificationSort(value as NotificationSort);
                            }}
                            sortOptions={sortOptions}
                            onClear={hasActiveNotificationFilters ? clearNotificationControls : undefined}
                            resultCount={filteredNotifications.length}
                          />
                        </div>
                      ) : null}

                      {notificationsState === "loading" ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }, (_, index) => (
                            <div key={index} className="rounded-xl border border-border bg-card/55 p-3">
                              <div className="mb-2 h-3 w-2/3 rounded bg-muted" />
                              <div className="mb-2 h-3 w-full rounded bg-muted/80" />
                              <div className="h-3 w-1/4 rounded bg-muted/70" />
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {notificationsState === "error" ? (
                        <DataErrorState
                          title="Notifications unavailable"
                          description={notificationsError ?? "Unable to fetch notifications right now."}
                          retryLabel="Retry"
                          onRetry={() => {
                            loadNotifications();
                          }}
                        />
                      ) : null}

                      {notificationsState === "success" && notifications.length === 0 ? (
                        <EmptyState
                          icon={Bell}
                          title="No new notifications"
                          description="You are all caught up for now."
                          className="px-4 py-8"
                        />
                      ) : null}

                      {notificationsState === "success" && notifications.length > 0 && filteredNotifications.length === 0 ? (
                        <EmptyState
                          icon={Bell}
                          title="No notifications match your filters"
                          description="Try clearing search or filters to see more activity."
                          className="px-4 py-8"
                          action={<Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={clearNotificationControls}>Clear Filters</Button>}
                        />
                      ) : null}

                      {notificationsState === "success" && filteredNotifications.length > 0 ? (
                        <div className="space-y-2">
                          {groupedVisibleNotifications.map((group) => (
                            <div key={group.label} className="space-y-2">
                              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {group.label}
                              </p>
                              {group.items.map((notification) => (
                                <div
                                  key={notification.id}
                                  className={[
                                    "rounded-xl border border-border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary/30",
                                    notification.read ? "bg-popover/70" : "bg-popover/90",
                                  ].join(" ")}
                                  onClick={() => {
                                    handleNotificationAction(notification.id);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      handleNotificationAction(notification.id);
                                    }
                                  }}
                                  role="button"
                                  tabIndex={0}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                                      <p className="mt-1 text-xs text-muted-foreground">{notification.detail}</p>
                                    </div>
                                    {notification.dismissible ? (
                                      <button
                                        type="button"
                                        className="rounded-full p-1 text-muted-foreground hover:bg-popover/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          dismissNotification(notification.id);
                                        }}
                                        aria-label={`Dismiss ${notification.title}`}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 flex items-center justify-between gap-3">
                                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                                    <div className="flex items-center gap-2">
                                      {notification.actionLabel ? (
                                        <button
                                          type="button"
                                          className="text-[11px] font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            handleNotificationAction(notification.id, true);
                                          }}
                                        >
                                          {notification.actionLabel}
                                        </button>
                                      ) : null}
                                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                                        {notification.category}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}

                          <LoadMoreFooter
                            shownCount={visibleNotifications.length}
                            totalCount={filteredNotifications.length}
                            onLoadMore={() => {
                              setNotificationVisibleCount((previous) => previous + 3);
                            }}
                            incrementLabel="Load more notifications"
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Profile */}
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    className="rounded-2xl p-1 transition-colors duration-200 ease-out hover:bg-popover/70 focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-[#4a9ff5]/30"
                    aria-label="Open profile menu"
                    aria-expanded={isProfileOpen}
                    aria-haspopup="menu"
                    onClick={() => {
                      setIsProfileOpen((previous) => !previous);
                    }}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.id ?? user?.email ?? "guest")}`}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                  </button>

                  {isProfileOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 mt-3 w-48 rounded-2xl border border-border/70 bg-popover/80 p-1.5 shadow-2xl backdrop-blur-xl"
                      style={{ boxShadow: "0 12px 35px rgba(0, 0, 0, 0.12)" }}
                    >
                      <Link
                        to="/settings"
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-overlay-1/80"
                        onClick={() => {
                          setIsProfileOpen(false);
                        }}
                      >
                        Settings
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-overlay-1/80"
                        onClick={() => {
                          setIsProfileOpen(false);
                          signOut();
                          navigate("/login", { replace: true });
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Link to="/pricing">
                  <Button variant="ghost" className="text-foreground hover:bg-surface-overlay-1/75">
                    Pricing
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="ghost" className="text-foreground hover:bg-surface-overlay-1/75">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
            <button
              type="button"
              className="rounded-2xl p-2 text-muted-foreground transition-colors duration-200 ease-out hover:bg-surface-overlay-1/75 hover:text-foreground focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-[#4a9ff5]/30"
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => {
                setTheme(isDarkMode ? "light" : "dark");
              }}
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
