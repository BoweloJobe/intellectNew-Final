import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Search, X } from "lucide-react";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
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

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
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
  const isAuthenticated = Boolean(user);
  const isPublicPage =
    location.pathname === "/" ||
    (!isAuthenticated && ["/login", "/signup", "/forgot-password", "/pricing"].includes(location.pathname));
  
  const navLinks = role === "instructor"
    ? [
        { name: "Dashboard", path: "/instructor" },
        { name: "My Courses", path: "/instructor/courses" },
        { name: "Community", path: "/community" },
        { name: "Pricing", path: "/pricing" },
      ]
    : role === "admin"
      ? [
          { name: "Admin", path: "/admin" },
          { name: "Courses", path: "/courses" },
          { name: "Community", path: "/community" },
          { name: "Pricing", path: "/pricing" },
        ]
      : [
          { name: "Dashboard", path: "/dashboard" },
          { name: "Courses", path: "/courses" },
          { name: "Learn", path: "/courses" },
          { name: "Quizzes", path: "/quizzes" },
          { name: "Progress", path: "/progress" },
          { name: "Community", path: "/community" },
          { name: "Pricing", path: "/pricing" },
        ];

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
    if (isPublicPage || !isGlobalSearchOpen) {
      return;
    }

    void loadGlobalSearchCatalog();
  }, [isGlobalSearchOpen, isPublicPage]);

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
    <nav className="sticky top-0 z-50 mx-4 mt-4 mb-8">
      <div 
        className="mx-auto max-w-7xl rounded-[28px] border border-white/70 bg-white/70 px-2.5 py-2 shadow-[0_12px_34px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Brand */}
          <Link
            to="/"
            className="flex h-9 shrink-0 items-center gap-2.5 rounded-2xl px-2.5 transition-colors duration-200 ease-out hover:bg-white/[0.55] focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-[#4a9ff5]/30"
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
              className="text-[1.06rem] font-semibold text-slate-950 tracking-[-0.01em]"
              style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}
            >
              intellectX
            </span>
          </Link>

          {/* Navigation Links - Only show when logged in */}
          {!isPublicPage && (
            <div className="hidden lg:inline-flex h-10 w-fit shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-[#f1f5f9]/80 p-1 text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-colors duration-200 ease-out">
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
                        ? "bg-white/90 text-slate-950 shadow-sm after:scale-x-100"
                        : "text-slate-600 hover:bg-white/[0.55] hover:text-slate-950",
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
            {!isPublicPage ? (
              <>
                <div className="relative" ref={globalSearchRef}>
                  <button
                    type="button"
                    className="rounded-2xl p-2 transition-colors duration-200 ease-out hover:bg-white/[0.55] focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-[#4a9ff5]/30 xl:hidden"
                    aria-label="Open global search"
                    onClick={() => {
                      setIsGlobalSearchOpen((previous) => !previous);
                      window.setTimeout(() => {
                        globalSearchInputRef.current?.focus();
                      }, 0);
                    }}
                  >
                    <Search className="w-5 h-5 text-gray-700" />
                  </button>

                  <div className="hidden xl:block">
                    <div className="relative w-52">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
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
                        className="h-9 rounded-2xl border-white/70 bg-[#f8fafc]/80 pl-9 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] transition-colors duration-200 ease-out placeholder:text-slate-500 focus-visible:ring-[#4a9ff5]/30"
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
                    className="relative rounded-2xl p-2 transition-colors duration-200 ease-out hover:bg-white/[0.55] focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-[#4a9ff5]/30"
                    onClick={() => {
                      setIsNotificationsOpen((previous) => !previous);
                    }}
                    aria-label="Toggle notifications"
                    aria-expanded={isNotificationsOpen}
                    aria-haspopup="dialog"
                  >
                    <Bell className="w-5 h-5 text-gray-700" />
                    {hasUnreadNotifications ? (
                      <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#4a9ff5] ring-2 ring-white" />
                    ) : null}
                  </button>

                  {isNotificationsOpen ? (
                    <div
                      role="dialog"
                      aria-label="Notifications panel"
                      className="absolute right-0 mt-3 w-[22rem] max-h-[75vh] overflow-y-auto overscroll-contain rounded-2xl border border-white/70 bg-white/75 p-4 shadow-2xl backdrop-blur-xl"
                      style={{ boxShadow: "0 12px 35px rgba(0, 0, 0, 0.12)" }}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">Notifications</h4>
                          <p className="text-xs text-gray-500">{unreadNotificationCount} unread</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#4a9ff5]"
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
                              className={`px-3 py-1 rounded-full text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40 ${
                                notificationGroupMode === "recency"
                                  ? "bg-[#4a9ff5] text-white"
                                  : "bg-white/[0.55] text-gray-700"
                              }`}
                              onClick={() => {
                                setNotificationGroupMode("recency");
                              }}
                            >
                              Grouped by recency
                            </button>
                            <button
                              type="button"
                              className={`px-3 py-1 rounded-full text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40 ${
                                notificationGroupMode === "type"
                                  ? "bg-[#4a9ff5] text-white"
                                  : "bg-white/[0.55] text-gray-700"
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
                            <div key={index} className="rounded-xl border border-white/50 bg-white/[0.45] p-3">
                              <div className="mb-2 h-3 w-2/3 rounded bg-white/80" />
                              <div className="mb-2 h-3 w-full rounded bg-white/70" />
                              <div className="h-3 w-1/4 rounded bg-white/60" />
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
                          action={<Button className="bg-[#4a9ff5] text-white hover:bg-[#2e8ef7]" onClick={clearNotificationControls}>Clear Filters</Button>}
                        />
                      ) : null}

                      {notificationsState === "success" && filteredNotifications.length > 0 ? (
                        <div className="space-y-2">
                          {groupedVisibleNotifications.map((group) => (
                            <div key={group.label} className="space-y-2">
                              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                {group.label}
                              </p>
                              {group.items.map((notification) => (
                                <div
                                  key={notification.id}
                                  className={[
                                    "rounded-xl border border-white/50 p-3 transition-colors focus-within:ring-2 focus-within:ring-[#4a9ff5]/30",
                                    notification.read ? "bg-white/[0.4]" : "bg-white/[0.65]",
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
                                      <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                                      <p className="mt-1 text-xs text-gray-600">{notification.detail}</p>
                                    </div>
                                    {notification.dismissible ? (
                                      <button
                                        type="button"
                                        className="rounded-full p-1 text-gray-400 hover:bg-white/60 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40"
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
                                    <p className="text-xs text-gray-500">{notification.time}</p>
                                    <div className="flex items-center gap-2">
                                      {notification.actionLabel ? (
                                        <button
                                          type="button"
                                          className="text-[11px] font-medium text-[#4a9ff5] hover:text-[#2e8ef7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9ff5]/40 rounded-sm"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            handleNotificationAction(notification.id, true);
                                          }}
                                        >
                                          {notification.actionLabel}
                                        </button>
                                      ) : null}
                                      <span className="rounded-full bg-[#4a9ff5]/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#4a9ff5]">
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
                    className="rounded-2xl p-1 transition-colors duration-200 ease-out hover:bg-white/[0.55] focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-[#4a9ff5]/30"
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
                      className="absolute right-0 mt-3 w-48 rounded-2xl border border-white/70 bg-white/80 p-1.5 shadow-2xl backdrop-blur-xl"
                      style={{ boxShadow: "0 12px 35px rgba(0, 0, 0, 0.12)" }}
                    >
                      <Link
                        to="/settings"
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-white/[0.72]"
                        onClick={() => {
                          setIsProfileOpen(false);
                        }}
                      >
                        Settings
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-white/[0.72]"
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
                <Link to="/login">
                  <Button variant="ghost" className="text-gray-700">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
