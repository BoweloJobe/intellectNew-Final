import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { EmptyState } from "../components/EmptyState";
import { GlassCard } from "../components/GlassCard";
import { ListControls, LoadMoreFooter, type ListOption } from "../components/ListControls";
import { SolidCard } from "../components/SolidCard";
import { DiscussionCardSkeleton } from "../components/skeletons/SectionSkeletons";
import { useAsyncFormSubmission } from "../hooks/useAsyncFormSubmission";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { Search, MessageCircle, ThumbsUp, Users, TrendingUp, Bookmark, Lock } from "lucide-react";
import { getDiscussionTrendingScore } from "../services/community.service";
import { saveDiscussionDraftForm } from "../services/form-flows.service";
import { useCommunityState } from "../state/community/CommunityStateContext";
import {
  createProductNotification,
  useNotificationsState,
} from "../state/notifications/NotificationsStateContext";
import { normalizeRequiredTextInput, trimmedTextRules } from "../utils/form-validation";
import { domainAdapterConfig } from "../api/config/apiConfig";

type DiscussionComposerValues = {
  title: string;
  category: string;
  body: string;
};

const isApiMode = domainAdapterConfig.community === "api";

export function CommunityPage() {
  const { addRecentActivity, pushNotification } = useNotificationsState();
  const {
    state: {
      joinedStudyGroups,
      userPreferences,
      communitySummary,
      communityData,
      communityViewState,
      communityError,
      communityViewPreferences,
      communityInteractions,
      communityDrafts,
    },
    toggleStudyGroupMembership,
    toggleTopicFollow,
    toggleDiscussionLike,
    toggleDiscussionPin,
    createDiscussion,
    createDiscussionDraft,
    setCommunityViewPreferences,
    reloadCommunityData,
    communityTrendingDiscussions,
  } = useCommunityState();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const {
    isSubmitting: isSubmittingComposer,
    submitError: composerError,
    submitSuccess: composerSuccess,
    clearStatus: clearComposerStatus,
    run: runComposerAction,
  } = useAsyncFormSubmission();
  const latestDraft = communityDrafts[0];
  const composerForm = useForm<DiscussionComposerValues>({
    defaultValues: {
      title: latestDraft?.title ?? "",
      category: "General",
      body: latestDraft?.body ?? "",
    },
    mode: "onBlur",
  });

  const { discussions, studyGroups, popularTopics } = communityData;
  const isLoading = communityViewState === "loading";
  const isError = communityViewState === "error";

  const categoryOptions: ListOption[] = [
    { value: "all", label: "All Categories" },
    ...Array.from(new Set(discussions.map((discussion) => discussion.category))).map((category) => ({
      value: category,
      label: category,
    })),
  ];

  const sortOptions: ListOption[] = [
    { value: "recent", label: "Sort: Most Recent" },
    { value: "trending", label: "Sort: Trending" },
    { value: "most-liked", label: "Sort: Most Liked" },
    { value: "most-replies", label: "Sort: Most Replies" },
  ];

  const filteredDiscussions = useMemo(() => {
    const query = communityViewPreferences.searchQuery.trim().toLowerCase();

    const searched = discussions.filter((discussion) => {
      if (!query) {
        return true;
      }

      return (
        discussion.title.toLowerCase().includes(query) ||
        discussion.author.toLowerCase().includes(query) ||
        discussion.category.toLowerCase().includes(query)
      );
    });

    const filtered = searched.filter((discussion) => {
      if (communityViewPreferences.categoryFilter === "all") {
        return true;
      }

      return discussion.category === communityViewPreferences.categoryFilter;
    });

    return [...filtered].sort((left, right) => {
      if (communityInteractions.pinnedDiscussionIds.includes(left.id) && !communityInteractions.pinnedDiscussionIds.includes(right.id)) {
        return -1;
      }

      if (!communityInteractions.pinnedDiscussionIds.includes(left.id) && communityInteractions.pinnedDiscussionIds.includes(right.id)) {
        return 1;
      }

      switch (communityViewPreferences.sortBy) {
        case "trending":
          return getDiscussionTrendingScore(right) - getDiscussionTrendingScore(left);
        case "most-liked":
          return right.likes - left.likes;
        case "most-replies":
          return right.replies - left.replies;
        case "recent":
        default:
          return left.hoursAgo - right.hoursAgo;
      }
    });
  }, [
    communityInteractions.pinnedDiscussionIds,
    communityViewPreferences.categoryFilter,
    communityViewPreferences.searchQuery,
    communityViewPreferences.sortBy,
    discussions,
  ]);

  const followedDiscussions = useMemo(() => {
    return discussions
      .filter((discussion) => userPreferences.favoriteTopics.includes(discussion.category))
      .sort((left, right) => getDiscussionTrendingScore(right) - getDiscussionTrendingScore(left));
  }, [discussions, userPreferences.favoriteTopics]);

  const visibleDiscussions = filteredDiscussions.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(3);
  }, [
    communityViewPreferences.categoryFilter,
    communityViewPreferences.searchQuery,
    communityViewPreferences.sortBy,
  ]);

  const hasActiveFilters =
    communityViewPreferences.searchQuery.trim().length > 0 || communityViewPreferences.categoryFilter !== "all";

  const clearFilters = () => {
    setCommunityViewPreferences({
      searchQuery: "",
      categoryFilter: "all",
      sortBy: "recent",
    });
  };

  const showActionFeedback = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage(null);
    window.setTimeout(() => {
      setSuccessMessage(null);
    }, 2200);
  };

  const showActionError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage(null);
    window.setTimeout(() => {
      setErrorMessage(null);
    }, 3500);
  };

  const openComposer = (mode: "draft" | "new") => {
    clearComposerStatus();
    composerForm.reset({
      title: mode === "draft" ? (latestDraft?.title ?? "") : "",
      category: "General",
      body: mode === "draft" ? (latestDraft?.body ?? "") : "",
    });
    setIsComposerOpen(true);
  };

  const handlePublishDiscussion = composerForm.handleSubmit(async (values) => {
    const title = normalizeRequiredTextInput(values.title);
    const category = normalizeRequiredTextInput(values.category) || "General";
    const body = normalizeRequiredTextInput(values.body);

    const result = await runComposerAction(
      async () => createDiscussion(title, body, category),
      {
        successMessage: "Discussion published to community.",
        onSuccess: async (published) => {
          if (!published) {
            return;
          }
          addRecentActivity("community", `Published discussion: ${title}`);
          pushNotification(
            createProductNotification({
              title: "Discussion published",
              detail: `${title} is now live in ${category}.`,
              category: "community",
              source: "community-reply",
              actionLabel: "View discussion",
            }),
          );
          showActionFeedback("Discussion published to community.");
          composerForm.reset({ title: "", category, body: "" });
          setIsComposerOpen(false);
        },
      },
    );

    if (!result) {
      composerForm.setError("title", { message: "Update the form and try publishing again." });
    }
  });

  const handleSaveDraft = composerForm.handleSubmit(async (values) => {
    const result = await runComposerAction(async () => saveDiscussionDraftForm({
      title: normalizeRequiredTextInput(values.title),
      category: normalizeRequiredTextInput(values.category),
      body: normalizeRequiredTextInput(values.body),
    }), {
      successMessage: "Draft saved locally.",
      onSuccess: async (submission) => {
        createDiscussionDraft(submission.title);
        addRecentActivity("community", `Saved draft ${submission.title}`);
        showActionFeedback("Draft created and saved locally.");
        setIsComposerOpen(false);
      },
    });

    if (!result) {
      composerForm.setError("title", { message: "Review the draft details and try again." });
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      <div className="mb-12">
        <h1 className="text-4xl font-semibold mb-2 text-gray-900">Community</h1>
        <p className="text-lg text-gray-700">Connect, collaborate, and learn together</p>
      </div>

      {successMessage ? <ActionSuccessState message={successMessage} className="mb-8" /> : null}

      {errorMessage ? <DataErrorState title="Action Failed" description={errorMessage} className="mb-8" /> : null}

      {isError ? (
        <div className="mb-8">
          <DataErrorState
            description={communityError ?? "Community data is temporarily unavailable. Retry to reload discussions and groups."}
            onRetry={() => {
              reloadCommunityData();
            }}
            retryLabel="Reload Community"
          />
        </div>
      ) : null}

      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Start a discussion</DialogTitle>
            <DialogDescription>
              Ask a focused question, share a study tactic, or start a peer conversation with enough detail for useful replies.
            </DialogDescription>
          </DialogHeader>

          <Form {...composerForm}>
            <form className="space-y-4" onSubmit={handlePublishDiscussion} noValidate>
              <FormField
                control={composerForm.control}
                name="title"
                rules={{
                  ...trimmedTextRules({
                    requiredMessage: "Add a discussion title.",
                    minLength: 8,
                    minLengthMessage: "Use at least 8 characters so people understand the topic.",
                    maxLength: 120,
                    maxLengthMessage: "Keep the title under 120 characters.",
                  }),
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Example: How are you structuring your system design revision?"
                        disabled={isSubmittingComposer}
                        {...field}
                        onChange={(event) => {
                          clearComposerStatus();
                          field.onChange(event);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={composerForm.control}
                name="category"
                rules={{
                  ...trimmedTextRules({
                    requiredMessage: "Choose a category.",
                    minLength: 2,
                    minLengthMessage: "Choose a category.",
                    maxLength: 60,
                    maxLengthMessage: "Keep the category under 60 characters.",
                  }),
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="General"
                        disabled={isSubmittingComposer}
                        {...field}
                        onChange={(event) => {
                          clearComposerStatus();
                          field.onChange(event);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={composerForm.control}
                name="body"
                rules={{
                  ...trimmedTextRules({
                    requiredMessage: "Add a few details so others can respond usefully.",
                    minLength: 24,
                    minLengthMessage: "Add a bit more context before posting.",
                    maxLength: 3000,
                    maxLengthMessage: "Keep context under 3000 characters.",
                  }),
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Context</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What have you tried so far? Where are you blocked? What kind of feedback would help most?"
                        className="min-h-32 bg-white"
                        disabled={isSubmittingComposer}
                        {...field}
                        onChange={(event) => {
                          clearComposerStatus();
                          field.onChange(event);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {composerError ? (
                <DataErrorState title="Could not save discussion" description={composerError} />
              ) : null}

              {composerSuccess ? <ActionSuccessState message={composerSuccess} /> : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmittingComposer}
                  onClick={() => {
                    void handleSaveDraft();
                  }}
                >
                  {isSubmittingComposer ? "Saving..." : "Save Draft"}
                </Button>
                <Button type="submit" className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white" disabled={isSubmittingComposer}>
                  {isSubmittingComposer ? "Publishing..." : "Publish Discussion"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <GlassCard className="mb-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex-1">
            <ListControls
              searchValue={communityViewPreferences.searchQuery}
              onSearchChange={(value) => {
                setCommunityViewPreferences({ searchQuery: value });
              }}
              searchPlaceholder="Search discussions by title, author, or category"
              filterValue={communityViewPreferences.categoryFilter}
              onFilterChange={(value) => {
                setCommunityViewPreferences({ categoryFilter: value });
              }}
              filterOptions={categoryOptions}
              sortValue={communityViewPreferences.sortBy}
              onSortChange={(value) => {
                setCommunityViewPreferences({ sortBy: value as typeof communityViewPreferences.sortBy });
              }}
              sortOptions={sortOptions}
              onClear={hasActiveFilters ? clearFilters : undefined}
              resultCount={isLoading || isError ? undefined : filteredDiscussions.length}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="font-semibold"
              onClick={() => {
                openComposer("draft");
              }}
            >
              {communityDrafts.length > 0 ? `Open Draft (${communityDrafts.length})` : "Start Draft"}
            </Button>
            <Button
              className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white font-semibold"
              onClick={() => {
                openComposer("new");
              }}
            >
              New Discussion
            </Button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="discussions">
            <TabsList className="mb-6">
              <TabsTrigger value="discussions">Discussions ({communitySummary.discussionCount})</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
              <TabsTrigger value="following">Following ({userPreferences.favoriteTopics.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="discussions" className="space-y-4">
              {isLoading
                ? Array.from({ length: 3 }, (_, index) => <DiscussionCardSkeleton key={index} />)
                : isError
                  ? null
                  : filteredDiscussions.length === 0
                  ? (
                    <EmptyState
                      icon={Search}
                      title={hasActiveFilters ? "No discussions match your filters" : "No discussions yet"}
                      description={
                        hasActiveFilters
                          ? "Try broadening your search or clear filters to explore more conversations."
                          : "Start the first conversation for your learning community. Ask a question or share a study insight to get things moving."
                      }
                      action={
                        hasActiveFilters
                          ? <Button className="bg-[#4a9ff5] text-white hover:bg-[#2e8ef7]" onClick={clearFilters}>Clear Filters</Button>
                          : <Button className="bg-[#4a9ff5] text-white hover:bg-[#2e8ef7]" onClick={() => { openComposer("new"); }}>Start Discussion</Button>
                      }
                    />
                    )
                  : visibleDiscussions.map((discussion) => {
                    const isLiked = communityInteractions.likedDiscussionIds.includes(discussion.id);
                    const isPinned = communityInteractions.pinnedDiscussionIds.includes(discussion.id);

                    return (
                      <GlassCard key={discussion.id} hover className="cursor-pointer">
                        <div className="flex gap-4">
                          <img
                            src={discussion.avatar}
                            alt={discussion.author}
                            className="w-12 h-12 rounded-full"
                          />

                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  {discussion.title}
                                  {isPinned ? (
                                    <span className="ml-2 px-2 py-0.5 rounded-full bg-[#4a9ff5]/10 text-xs font-semibold text-[#4a9ff5]">
                                      Pinned
                                    </span>
                                  ) : null}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                  <span>{discussion.author}</span>
                                  <span>•</span>
                                  <span className="px-2 py-0.5 rounded-full bg-[#4a9ff5]/10 text-[#4a9ff5]">
                                    {discussion.category}
                                  </span>
                                  <span>•</span>
                                  <span>{discussion.time}</span>
                                </div>
                              </div>
                              <div className="text-xs font-medium text-gray-500">
                                {Math.round(getDiscussionTrendingScore(discussion))} trend pts
                              </div>
                            </div>

                            <div className="flex items-center gap-6 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <MessageCircle className="w-4 h-4" />
                                <span>{discussion.replies} replies</span>
                              </div>
                              <button
                                type="button"
                                className={`flex items-center gap-1 transition-colors ${isLiked ? "text-[#4a9ff5]" : "hover:text-[#4a9ff5]"}`}
                                onClick={() => {
                                  void (async () => {
                                    const success = await toggleDiscussionLike(discussion.id);
                                    if (success) {
                                      showActionFeedback(
                                        isLiked
                                          ? `Removed like from ${discussion.title}.`
                                          : `Liked ${discussion.title}.`,
                                      );
                                    } else {
                                      showActionError("Could not update like. Please try again.");
                                    }
                                  })();
                                }}
                              >
                                <ThumbsUp className={`w-4 h-4 ${isLiked ? "fill-[#4a9ff5]" : ""}`} />
                                <span>{discussion.likes} likes</span>
                              </button>
                              <button
                                type="button"
                                className={`flex items-center gap-1 transition-colors ${isPinned ? "text-[#4a9ff5]" : "hover:text-[#4a9ff5]"}`}
                                onClick={() => {
                                  void (async () => {
                                    const success = await toggleDiscussionPin(discussion.id);
                                    if (success) {
                                      addRecentActivity(
                                        "community",
                                        `${isPinned ? "Unpinned" : "Pinned"} discussion ${discussion.title}`,
                                      );
                                      showActionFeedback(
                                        isPinned
                                          ? `Unpinned ${discussion.title}.`
                                          : `Pinned ${discussion.title}.`,
                                      );
                                    } else {
                                      showActionError("Could not update pin. Please try again.");
                                    }
                                  })();
                                }}
                              >
                                <Bookmark className={`w-4 h-4 ${isPinned ? "fill-[#4a9ff5]" : ""}`} />
                                <span>{isPinned ? "Pinned" : "Pin"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    );
                  })}

              {!isLoading && !isError && filteredDiscussions.length > 0 ? (
                <LoadMoreFooter
                  shownCount={visibleDiscussions.length}
                  totalCount={filteredDiscussions.length}
                  onLoadMore={() => {
                    setVisibleCount((previous) => previous + 3);
                  }}
                  incrementLabel="Load more discussions"
                />
              ) : null}
            </TabsContent>

            <TabsContent value="trending" className="space-y-4">
              {communityTrendingDiscussions.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No trending topics right now"
                  description="As activity grows, the most engaged discussions will surface here automatically."
                />
              ) : (
                communityTrendingDiscussions.map((discussion) => (
                  <SolidCard key={`trending-${discussion.id}`} hover>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{discussion.title}</h4>
                      <span className="text-xs font-semibold text-[#4a9ff5]">
                        {Math.round(getDiscussionTrendingScore(discussion))} trend pts
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>{discussion.category}</span>
                      <span>{discussion.replies} replies</span>
                      <span>{discussion.likes} likes</span>
                      <span>{discussion.time}</span>
                    </div>
                  </SolidCard>
                ))
              )}
            </TabsContent>

            <TabsContent value="following" className="space-y-4">
              {userPreferences.favoriteTopics.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="You are not following any topics yet"
                  description="Follow subjects you care about to build a personalized discussion feed."
                />
              ) : followedDiscussions.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No discussions in your followed topics"
                  description="Try following additional topics or come back as new discussions are posted."
                />
              ) : (
                followedDiscussions.map((discussion) => (
                  <SolidCard key={`following-${discussion.id}`} hover>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{discussion.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{discussion.author} • {discussion.category}</p>
                      </div>
                      <span className="text-xs font-medium text-[#4a9ff5]">{discussion.time}</span>
                    </div>
                  </SolidCard>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <GlassCard>
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Study Groups</h3>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, index) => (
                  <DiscussionCardSkeleton key={`groups-loading-${index}`} />
                ))}
              </div>
            ) : studyGroups.length === 0 ? (
              <EmptyState
                icon={Users}
                title={isApiMode ? "Study groups coming soon" : "No study groups available"}
                description={isApiMode ? "Study group collaboration features will be available in a future update." : "Check back shortly or create a new group to collaborate with peers."}
                className="px-4 py-8"
              />
            ) : (
              <div className="space-y-3">
                {studyGroups.map((group) => {
                  const isJoined = joinedStudyGroups.includes(group.name);

                  return (
                    <SolidCard
                      key={group.name}
                      hover
                      className="cursor-pointer"
                      onClick={() => {
                        toggleStudyGroupMembership(group.name);
                        addRecentActivity(
                          "community",
                          `${isJoined ? "Left" : "Joined"} ${group.name}`,
                        );
                        pushNotification(
                          createProductNotification({
                            title: isJoined ? "Study group left" : "Study group joined",
                            detail: `${isJoined ? "You left" : "You joined"} ${group.name}.`,
                            category: "community",
                            source: "community-reply",
                            actionLabel: "View groups",
                          }),
                        );
                        showActionFeedback(
                          isJoined
                            ? `You left ${group.name}.`
                            : `You joined ${group.name}.`,
                        );
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{group.name}</h4>
                        <Button size="sm" variant={isJoined ? "outline" : "default"} className={isJoined ? "" : "bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"}>
                          {isJoined ? "Leave" : "Join"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {group.members + (isJoined ? 1 : 0)} members
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isJoined
                            ? "bg-[#4a9ff5]/10 text-[#4a9ff5]"
                            : group.activity === "Very Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {isJoined ? "Joined" : group.activity}
                        </span>
                      </div>
                    </SolidCard>
                  );
                })}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full mt-4 font-medium"
              disabled={isApiMode}
              onClick={() => {
                openComposer("new");
              }}
            >
              Browse All Groups
            </Button>
          </GlassCard>

          <GlassCard>
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Popular Topics</h3>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <div
                    key={`topic-loading-${index}`}
                    className="h-8 rounded-full border border-white/50 bg-white/[0.45]"
                  />
                ))}
              </div>
            ) : popularTopics.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No topics to show"
                description="Topic recommendations will appear after more discussions are created."
                className="px-4 py-8"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {popularTopics.map((topic) => {
                  const isFollowing = userPreferences.favoriteTopics.includes(topic);
                  const isDisabled = isApiMode;

                  return (
                    <button
                      key={topic}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all relative group ${
                        isDisabled
                          ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                          : isFollowing
                          ? "bg-[#4a9ff5] border-[#4a9ff5] text-white"
                          : "bg-[#f9fafb] border-[rgba(0,0,0,0.06)] text-gray-700 hover:bg-[#4a9ff5] hover:text-white"
                      }`}
                      disabled={isDisabled}
                      title={isDisabled ? "Topic following coming soon" : ""}
                      onClick={() => {
                        if (!isDisabled) {
                          toggleTopicFollow(topic);
                          addRecentActivity(
                            "community",
                            `${isFollowing ? "Unfollowed" : "Followed"} topic ${topic}`,
                          );
                          pushNotification(
                            createProductNotification({
                              title: isFollowing ? "Topic unfollowed" : "Topic followed",
                              detail: `${isFollowing ? "Stopped following" : "Now following"} ${topic}.`,
                              category: "community",
                              source: "community-reply",
                              actionLabel: "Open community",
                            }),
                          );
                          showActionFeedback(`${isFollowing ? "Stopped following" : "Now following"} ${topic}.`);
                        }
                      }}
                    >
                      {topic}
                      {isDisabled && (
                        <Lock className="w-3 h-3 inline-block ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </GlassCard>

          <GlassCard className="bg-gradient-to-br from-[#4a9ff5]/10 to-[#0d6efd]/10">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Guidelines</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Be respectful and supportive</li>
              <li>• Share knowledge freely</li>
              <li>• Stay on topic</li>
              <li>• No plagiarism or cheating</li>
            </ul>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
